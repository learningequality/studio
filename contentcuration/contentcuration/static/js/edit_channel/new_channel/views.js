var Backbone = require("backbone");
var _ = require("underscore");
require("channel_create.less");
var Dropzone = require("dropzone");
require("dropzone/dist/dropzone.css");
var Models = require("edit_channel/models");
var BaseViews = require("edit_channel/views");
var get_cookie = require("utils/get_cookie");
var stringHelper = require("edit_channel/utils/string_helper")

var ChannelList  = BaseViews.BaseEditableListView.extend({
	template: require("./hbtemplates/channel_create.handlebars"),
	list_selector: "#channel_list",
	default_item: ".default-item",

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
	},
	events: {
		'click .new_channel_button' : 'new_channel'
	},
	create_new_view:function(data){
		var newView = new ChannelListItem({
			model: data,
			containing_list_view: this,
		});
		this.views.push(newView);
  		return newView;
	},
	new_channel: function(){
		var data = {
			editors: [window.current_user.id],
		};
		var newView = this.create_new_view(new Models.ChannelModel(data));
		this.$(this.list_selector).prepend(newView.el);
		newView.edit_channel();
		newView.set_is_new(true);
	},
	set_editing: function(edit_mode_on){
		$(".disable-on-edit").prop("disabled", edit_mode_on);
		$(".disable-on-edit").css("cursor", (edit_mode_on) ? "not-allowed" : "pointer");
		$(".invisible-on-edit").css('visibility', (edit_mode_on)?'hidden' : 'visible');
		(edit_mode_on)? $(".new_channel_button").addClass("disabled") : $(".new_channel_button").removeClass("disabled");
		$(".new_channel_button").prop('title', (edit_mode_on)? 'Cannot create a new channel while another channel is being edited.' : "Create a new channel");
	},
	handle_channel_change:function(channel, deleted){
		this.update_channel_collection(channel, deleted);
	},
	update_channel_collection:function(channel, deleted){
		if(deleted){
			window.channels = _.reject(window.channels, function(c){return c.id == channel.id});
		}else{
			var match = _.findWhere(window.channels, {id:channel.id});
			if(match){
				var index = window.channels.indexOf(match);
				window.channels[index] = channel.toJSON();
			}else{
				window.channels.push(channel.toJSON());
			}
		}
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
		this.bind_edit_functions();
		_.bindAll(this, 'edit_channel','delete_channel','toggle_channel','save_channel','thumbnail_uploaded', 'update_title', 'copy_id',
						'thumbnail_added','thumbnail_removed','create_dropzone', 'thumbnail_completed','thumbnail_failed', 'open_channel');
		this.listenTo(this.model, "sync", this.render);
		this.edit = false;
		this.containing_list_view = options.containing_list_view;
		this.original_thumbnail = this.model.get("thumbnail");
		this.original_thumbnail_url = this.model.get("thumbnail_url");
		this.thumbnail_url = this.original_thumbnail_url;
		this.thumbnail = this.original_thumbnail;
		this.originalData = (this.model)? this.model.toJSON() : null;
		this.isViewOnly = this.model.get("viewers").indexOf(window.current_user.get("id")) >= 0;
		this.render();
		this.dropzone = null;
		this.isNew = false;
		this.thumbnail_success = true;
	},
	set_is_new:function(isNew){
		this.isNew = isNew;
		if (this.isNew){
			this.$(".save_channel").attr("disabled", "disabled");
	  		this.$(".save_channel").prop("disabled", true);
	  		this.$(".save_channel").css("cursor", "not-allowed");
		}
	},
	render: function() {
		this.$el.html(this.template({
			view_only: this.isViewOnly,
			edit: this.edit,
			channel: this.model.toJSON(),
			total_file_size: this.model.get("main_tree").metadata.resource_size,
			resource_count: this.model.get("main_tree").metadata.resource_count,
			channel_link : this.model.get("id"),
			picture : this.thumbnail_url
		}));
	},
	events: {
		'click .edit_channel':'edit_channel',
		'mouseover .edit_channel':'remove_highlight',
		'mouseover .copy-id-btn':'remove_highlight',
		'click .delete_channel' : 'delete_channel',
		'click .channel_toggle': 'toggle_channel',
		'click .save_channel': 'save_channel',
		'keyup #new_channel_name': 'update_title',
		'keyup #new_channel_name': 'update_title',
		'paste #new_channel_name': 'update_title',
		'click .copy-id-btn' : 'copy_id',
		'click .open_channel': 'open_channel',
		'mouseover .open_channel': 'add_highlight',
		'mouseleave .open_channel': 'remove_highlight',
	},
	remove_highlight:function(event){
		event.stopPropagation();
		event.preventDefault();
		this.$('.channel-container-wrapper').removeClass('highlight');
	},
	add_highlight:function(event){
		this.$('.channel-container-wrapper').addClass('highlight');
	},
	open_channel:function(event){
		if(!this.edit){
			window.location.href = '/channels/' + this.model.get("id") + ((this.isViewOnly)? '/view' : '/edit');
		}
	},
	copy_id:function(event){
		event.stopPropagation();
		event.preventDefault();
		var self = this;
		this.$(".copy-id-text").focus();
		this.$(".copy-id-text").select();
		try {
	    	document.execCommand("copy");
	    	self.$(".copy-id-btn").removeClass("glyphicon-copy").addClass("glyphicon-ok");
	    } catch(e) {
	        self.$(".copy-id-btn").removeClass("glyphicon-copy").addClass("glyphicon-remove");
	    }
	    setTimeout(function(){
	    	self.$(".copy-id-btn").removeClass("glyphicon-ok").removeClass("glyphicon-remove").addClass("glyphicon-copy");
	    }, 2500);
	},
	update_title:function(event){
		if (event.target.value.length === 0){
			this.$("#channel_name_error").css("visibility", "visible");
			this.$(".save_channel").attr("disabled", "disabled");
      		this.$(".save_channel").prop("disabled", true);
      		this.$(".save_channel").css("cursor", "not-allowed");
		} else{
			this.$("#channel_name_error").css("visibility", "hidden");
			this.$(".save_channel").removeAttr("disabled");
	        this.$(".save_channel").prop("disabled", false);
	        this.$(".save_channel").css("cursor", "pointer");
		}
	},
	edit_channel: function(){
		this.containing_list_view.set_editing(true);
		this.edit = true;
		this.render();
		this.create_dropzone();
	},
	delete_channel: function(event){
		if(this.isNew){
			this.delete(true, " ");
			this.containing_list_view.set_editing(false);
		}
		else if(confirm("WARNING: All content under this channel will be permanently deleted."
					+ "\nAre you sure you want to delete this channel?")){
			var self = this;
			this.save({"deleted":true}, "Deleting Channel...").then(function(){
				self.containing_list_view.set_editing(false);
				self.containing_list_view.collection.remove(self.model);
				self.containing_list_view.render();
				self.containing_list_view.handle_channel_change(self.model, true);
			});
		}else{
			this.cancel_actions(event);
		}
	},
	toggle_channel: function(event){
		event.stopPropagation();
		event.preventDefault();
		this.thumbnail = this.original_thumbnail;
		this.thumbnail_url = this.original_thumbnail_url;
		this.containing_list_view.set_editing(false);
		if(this.isNew){
			this.delete(true, " ");
		}else{
			this.unset();
			this.edit = false;
			this.render();
		}
	},
	save_channel: function(event){
		this.containing_list_view.set_editing(false);
		this.set_is_new(false);
		var title = this.$el.find("#new_channel_name").val().trim();
		var description = this.$el.find("#new_channel_description").val();
		var data = {
			name: title,
			description: description,
			thumbnail : this.thumbnail,
			editors: this.model.get('editors')
		};
		this.original_thumbnail = this.thumbnail;
		this.original_thumbnail_url = this.thumbnail_url;
		this.edit = false;

		var self = this;
		this.save(data, "Saving Channel...").then(function(channel){
			self.model = channel;
			self.render();
			self.containing_list_view.handle_channel_change(channel, false);
		});
	},
	set_channel:function(){
		this.set({
			name: (this.$el.find("#new_channel_name").val().trim() == "")? "[Untitled Channel]" : this.$el.find("#new_channel_name").val().trim(),
			description: this.$el.find("#new_channel_description").val(),
			thumbnail : this.thumbnail
		});
	},
	set_editing: function(edit_mode_on){
		this.containing_list_view.set_editing(edit_mode_on);
	},

/* THUMBNAIL FUNCTIONS */
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
	thumbnail_uploaded:function(thumbnail){
		this.thumbnail_error = null;
		result = JSON.parse(thumbnail.xhr.response)
		this.thumbnail = result.filename;
		this.thumbnail_url = result.file_url;
	},
	thumbnail_completed:function(){
		if(this.thumbnail_error){
			alert(this.thumbnail_error);
		}else{
			this.set_channel();
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
});

module.exports = {
	ChannelList : ChannelList
}