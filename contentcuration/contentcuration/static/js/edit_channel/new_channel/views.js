var Backbone = require("backbone");
var _ = require("underscore");
require("channel_create.less");
var Dropzone = require("dropzone");
require("dropzone/dist/dropzone.css");
var Models = require("edit_channel/models");
var BaseViews = require("edit_channel/views");
var get_cookie = require("utils/get_cookie");

var ChannelList  = BaseEditableListView.extend({
	template: require("./hbtemplates/channel_create.handlebars"),
	dropdown_template: require("./hbtemplates/channel_dropdown.handlebars"),
	list_selector: "#channel_list",

	initialize: function(options) {
		_.bindAll(this, 'new_channel');
		this.bind_edit_functions();
		this.collection = options.channels;
		this.render();
		this.user = options.user;
	},
	render: function() {
		this.set_editing(false);
		this.$el.html(this.template({
			channel_list: this.collection.toJSON(),
			user: window.current_user
		}));
		this.load_content(this.collection.where({deleted:false}));
		this.load_dropdown();
	},
	events: {
		'click .new_channel_button' : 'new_channel'
	},
	create_new_view:function(data){
		var newView = new ChannelListItem({
			model: new Models.ChannelModel(data),
			containing_list_view: this,
		});
		this.views.push(newView);
  	return newView;
	},
	new_channel: function(){
		var self = this;
		var data = {
			name:null,
			description:null,
			thumbnail:"/static/img/kolibri_placeholder.png"
		};
		this.create_new_item(data, true).then(function(newView){
			newView.edit_channel();
		});
	},
	load_dropdown:function(){
		var self = this;
		$("#channel_selection_dropdown_list").html(this.dropdown_template({
			channel_list: this.collection.toJSON()
		}));
	},
	set_editing: function(edit_mode_on){
		$(".disable-on-edit").prop("disabled", edit_mode_on);
		$(".disable-on-edit").css("cursor", (edit_mode_on) ? "not-allowed" : "pointer");
		$(".invisible-on-edit").css('visibility', (edit_mode_on)?'hidden' : 'visible');
	},
	handle_if_empty:function(){
		this.$el.find(".default-item").css("display", (this.views.length > 0) ? "block" : "none");
	}
});

/*
	edit: determines whether to load channel or editor
*/
var ChannelListItem = BaseViews.BaseListEditableItemView.extend({
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
		this.edit = false;
		this.containing_list_view = options.containing_list_view;
		this.original_thumbnail = this.model.get("thumbnail");
		this.thumbnail = this.original_thumbnail;
		this.originalData = (this.model)? this.model.toJSON() : null;
		this.render();
		this.dropzone = null;
		this.thumbnail_success = true;
	},

	render: function() {
		this.$el.html(this.template({
			edit: this.edit,
			channel: this.model.toJSON(),
			total_file_size: this.model.get("resource_size"),
			resource_count: this.model.get("resource_count"),
			channel_link : this.model.get("id"),
			picture : this.thumbnail
		}));
	},
	events: {
		'click .edit_channel':'edit_channel',
		'click .delete_channel' : 'delete_channel',
		'click .channel_toggle': 'toggle_channel',
		'click .save_channel': 'save_channel'
	},
	edit_channel: function(){
		this.containing_list_view.set_editing(true);
		this.edit = true;
		this.render();
		this.create_dropzone();
	},
	thumbnail_uploaded:function(thumbnail){
		this.thumbnail_error = null;
		this.thumbnail = JSON.parse(thumbnail.xhr.response).filename;
	},
	thumbnail_completed:function(){
		if(!this.thumbnail_error){
			this.thumbnail = $("#urlize_me")[0].src;
		}else{
			alert(this.thumbnail_error);
		}
		this.set_channel();
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
		if(this.model.isNew()){
			this.containing_list_view.set_editing(false);
			this.remove();
			this.containing_list_view.collection.remove(this.model);
			this.containing_list_view.load_content();
		}else if(confirm("WARNING: All content under this channel will be permanently deleted."
					+ "\nAre you sure you want to delete this channel?")){
			var self = this;
			this.display_load("Deleting Channel...", function(resolve, reject){
				try{
					self.containing_list_view.set_editing(false);
					self.delete();
					self.remove();
					self.containing_list_view.collection.remove(self.model);
					self.containing_list_view.load_content();
					resolve("Success!");
				}catch(error){
					reject(error)
				}


			});
		}else{
			event.stopPropagation();
			event.preventDefault();
		}
	},
	toggle_channel: function(){
		this.thumbnail = this.original_thumbnail;
		this.containing_list_view.set_editing(false);
		this.unset();
		if(!this.model.isNew()){
			this.edit = false;
			this.render();
		}else{
			this.remove();
			this.containing_list_view.load_content();
		}
	},
	save_channel: function(event){
		var self = this;
		self.containing_list_view.set_editing(false);
		var title = (self.$el.find("#new_channel_name").val().trim() == "")? "[Untitled Channel]" : self.$el.find("#new_channel_name").val().trim();
		var description = self.$el.find("#new_channel_description").val();
		var data = {
			name: title,
			description: description,
			thumbnail : this.thumbnail,
			editors: [window.current_user.id]
		};
		this.originalData = data;
		this.original_thumbnail = this.thumbnail;

		this.display_load("Saving Channel...", function(resolve, reject){
			self.edit = false;
			self.save(data).then(function(channel){
				self.model = new Models.ChannelModel(channel);
				self.containing_list_view.load_content();
				self.remove();
				resolve("Success!");
			});
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
	},

	set_channel:function(){
		this.set({
			name: (this.$el.find("#new_channel_name").val().trim() == "")? "[Untitled Channel]" : this.$el.find("#new_channel_name").val().trim(),
			description: this.$el.find("#new_channel_description").val(),
			thumbnail : this.thumbnail
		});
	},



	delete:function(){
		if(!this.model){
    		this.remove();
	    }else{
	    	this.model.save({"deleted":true});
	    	this.remove();
	    }
	},

	set_editing: function(edit_mode_on){
		this.containing_list_view.set_editing(edit_mode_on);
	},


	unset:function(){
		this.model.set(this.originalData);
	},
});

module.exports = {
	ChannelList : ChannelList
}