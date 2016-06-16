var Backbone = require("backbone");
var _ = require("underscore");
require("channel_create.less");
var Dropzone = require("dropzone");
require("dropzone/dist/dropzone.css");
var Models = require("edit_channel/models");
var BaseViews = require("edit_channel/views");
var get_cookie = require("utils/get_cookie");
var urlizer = require("edit_channel/utils/data_url");

var ChannelList  = BaseListView.extend({
	template: require("./hbtemplates/channel_create.handlebars"),
	item_view: "channel", // TODO: Use to indicate how to save items on list

	initialize: function(options) {
		_.bindAll(this, 'new_channel');
		this.collection = options.channels;
		this.render();
		this.user = options.user;
        this.listenTo(this.collection, "remove", this.render);
        this.listenTo(this.collection, "sync", this.render);
	},
	render: function() {
		this.set_editing(false);
		this.$el.html(this.template({
			channel_list: this.collection.toJSON(),
			user: this.user
		}));
		this.load_content();
	},
	events: {
		'click .new_channel_button' : 'new_channel'
	},

	new_channel: function(event){
		this.set_editing(true);
		var new_channel = new ChannelListItem({
			edit:true,
			containing_list_view: this,
			default_license: window.licenses.get_default(),
		});
		this.$el.find("#channel_list").append(new_channel.el);
	},
	load_content:function(){
		var self = this;
		$("#channel_selection_dropdown_list").html("");
		this.collection.forEach(function(entry){
			var view = new ChannelListItem({
				model: entry,
				edit: false,
				containing_list_view: self,
				channel_list: self.collection.toJSON()
			});
			self.$("#channel_list").append(view.el);
			self.views.push(view);
        	$("#channel_selection_dropdown_list").append("<li><a href='" + entry.get("id") + "/edit' class='truncate'>" + entry.get("name") + "</a></li>");
		});
	}
});

/*
	edit: determines whether to load channel or editor
*/
var ChannelListItem = BaseViews.BaseListChannelItemView.extend({
	tagName: "li",
	id: function(){
		return (this.model)? this.model.get("id") : "new";
	},
	className:"channel_container container",
	template: require("./hbtemplates/channel_container.handlebars"),
	dropzone_template: require("./hbtemplates/channel_profile_dropzone.handlebars"),
	initialize: function(options) {
		_.bindAll(this, 'edit_channel','delete_channel','toggle_channel','save_channel','thumbnail_uploaded',
						'thumbnail_added','thumbnail_removed','create_dropzone', 'thumbnail_completed','thumbnail_failed');
		this.listenTo(this.model, "sync", this.render);
		this.edit = options.edit;
		this.containing_list_view = options.containing_list_view;
		this.default_license = options.default_license;
		this.original_thumbnail = (this.model && this.model.get("thumbnail"))? this.model.get("thumbnail") : "/static/img/unicef logo.jpg";
		this.thumbnail = this.original_thumbnail;
		this.render();
		this.dropzone = null;
		this.thumbnail_success = true;
	},

	render: function() {
		this.$el.html(this.template({
			edit: this.edit,
			channel: (this.model) ? this.model.attributes : null,
			total_file_size: (this.model)? this.model.get("resource_size") : 0,
			resource_count: (this.model)? this.model.get("resource_count") : 0,
			channel_link : (this.model) ? this.model.get("id") : null,
			picture : this.thumbnail
		}));
		if(this.edit){
			var self = this;
			setTimeout(function(){
				self.create_dropzone();
			}, 100);
        }
	},
	events: {
		'click .edit_channel':'edit_channel',
		'click .delete_channel' : 'delete_channel',
		'click .channel_toggle': 'toggle_channel',
		'click .save_channel': 'save_channel'
	},
	edit_channel: function(event){
		this.containing_list_view.set_editing(true);
		this.edit = true;
		this.render();
	},
	thumbnail_uploaded:function(thumbnail){
		this.thumbnail_error = null;
	},
	thumbnail_completed:function(){
		if(!this.thumbnail_error){
			this.thumbnail = $("#urlize_me")[0].src;
		}else{
			alert(this.thumbnail_error);
		}
		this.render();
		this.enable_submit();
	},
	thumbnail_failed:function(data, error){
		this.thumbnail_error = error;
	},
	thumbnail_added:function(thumbnail){
		this.thumbnail_error = "Error uploading file: connection interrupted";
		$("#dz-placeholder").css("display", "none");
		this.disable_submit();
	},
	thumbnail_removed:function(thumbnail){
		this.thumbnail_error = null;
		$("#dz-placeholder").css("display", "block");
		this.enable_submit();
	},
	enable_submit:function(){
		this.$(".save_channel").removeAttr("disabled");
	},
	disable_submit:function(){
		this.$(".save_channel").attr("disabled", "disabled");
	},
	delete_channel: function(event){
		if(this.model && (confirm("WARNING: All content under this channel will be permanently deleted."
					+ "\nAre you sure you want to delete this channel?"))){
			var self = this;
			this.display_load("Deleting Channel...", function(){
				self.delete();
			});
		}else if(!this.model){
			this.containing_list_view.set_editing(false);
			this.delete_view();
		}
	},
	toggle_channel: function(event){
		this.thumbnail = this.original_thumbnail;
		this.containing_list_view.set_editing(false);
		if(this.model){
			this.edit = false;
			this.render();
		}else{
			this.delete_view();
		}
	},
	save_channel: function(event){
		var self = this;
		self.containing_list_view.set_editing(false);
		var title = (self.$el.find("#new_channel_name").val().trim() == "")? "[Untitled Channel]" : self.$el.find("#new_channel_name").val().trim();
		var description = (self.$el.find("#new_channel_description").val() == "") ? " " : self.$el.find("#new_channel_description").val();
		var data = {
			name: title,
			description: description,
			thumbnail : this.thumbnail
		};
		this.original_thumbnail = this.thumbnail;

		this.display_load("Saving Channel...", function(){
			self.edit = false;
			self.save(data, {async:false});
			self.render();
		});
	},

	create_dropzone:function(){
		this.dropzone = new Dropzone(this.$("#dropzone").get(0), {
			maxFiles: 1,
			clickable: ["#dz-placeholder", "#swap-thumbnail"],
			acceptedFiles: "image/jpeg,image/png",
			url: window.Urls.thumbnail_upload(),
			previewTemplate:this.dropzone_template(),
			previewsContainer: "#dropzone",
			headers: {"X-CSRFToken": get_cookie("csrftoken")}
		});
    	this.dropzone.on("success", this.thumbnail_uploaded);
    	this.dropzone.on("addedfile", this.thumbnail_added);
    	this.dropzone.on("removedfile", this.thumbnail_removed);
    	this.dropzone.on("queuecomplete", this.thumbnail_completed);
    	this.dropzone.on("error", this.thumbnail_failed);

	}
});

module.exports = {
	ChannelList : ChannelList
}