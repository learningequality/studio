var Backbone = require("backbone");
var _ = require("underscore");
require("channel_create.less");
var Dropzone = require("dropzone");
require("dropzone/dist/dropzone.css");
var Models = require("edit_channel/models");
var BaseViews = require("edit_channel/views");
var FileViews = require("edit_channel/file_upload/views");
var get_cookie = require("utils/get_cookie");
var stringHelper = require("edit_channel/utils/string_helper")

var ChannelList  = BaseViews.BaseEditableListView.extend({
	template: require("./hbtemplates/channel_create.handlebars"),
	list_selector: "#channel_list",
	default_item: ".default-item",

	initialize: function(options) {
		_.bindAll(this, 'new_channel');
		this.bind_edit_functions();
		this.render();
		this.user = options.user;
	},
	render: function() {
		this.set_editing(false);
		this.$el.html(this.template({
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
			pending_editors: []
		};
		var newView = this.create_new_view(new Models.ChannelModel(data));
		this.$(this.list_selector).prepend(newView.el);
		this.$(".default-item").css('display', 'none');
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
	initialize: function(options) {
		this.bind_edit_functions();
		_.bindAll(this, 'edit_channel','delete_channel','toggle_channel','save_channel','update_title', 'loop_focus', 'copy_id',
						'open_channel', 'set_thumbnail', 'reset_thumbnail','enable_submit', 'disable_submit', 'remove_thumbnail');
		this.listenTo(this.model, "sync", this.render);
		this.edit = false;
		this.containing_list_view = options.containing_list_view;
		this.original_thumbnail = this.model.get("thumbnail");
		this.original_thumbnail_url = this.model.get("thumbnail_url");
		this.thumbnail_url = this.original_thumbnail_url;
		this.thumbnail = this.original_thumbnail;
		this.originalData = (this.model)? this.model.toJSON() : null;
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
			edit: this.edit,
			channel: this.model.toJSON(),
			total_file_size: this.model.get("size"),
			resource_count: this.model.get("count"),
			channel_link : this.model.get("id"),
			picture : this.thumbnail_url
		}));
		this.$("#new_channel_name").focus();
		this.$("#new_channel_name").select();
		if(this.edit){
			this.image_upload = new FileViews.ThumbnailUploadView({
				model: this.model,
				el: this.$(".new_channel_pic"),
				preset_id: 'channel_thumbnail',
				upload_url: window.Urls.thumbnail_upload(),
				acceptedFiles: 'image/jpeg,image/jpeg,image/png',
				image_url: this.thumbnail_url,
				default_url: "/static/img/kolibri_placeholder.png",
				onsuccess: this.set_thumbnail,
				onerror: this.reset_thumbnail,
				oncancel:this.enable_submit,
				onstart: this.disable_submit,
				onremove: this.remove_thumbnail,
				allow_edit: true
			});
		}
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
		'focus .input-tab-control': 'loop_focus',
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
			window.location.href = '/channels/' + this.model.get("id") + ((this.model.get('view_only'))? '/view' : '/edit');
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
	update_title:function(){
		this.show_error(!this.$("#new_channel_name").val().length);
	},
	show_error: function(is_error){
		if(is_error){
			this.$("#channel_name_error").css("visibility", "visible");
			this.$(".save_channel").attr("disabled", "disabled");
      		this.$(".save_channel").prop("disabled", true);
      		this.$(".save_channel").css("cursor", "not-allowed");
		}else{
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
	},
	delete_channel: function(event){
		if(this.isNew){
			this.delete(true, " ");
			this.containing_list_view.set_editing(false);
		}else{
			var self = this;
            var dialog = require("edit_channel/utils/dialog");
            dialog.dialog("WARNING", "All content under this channel will be permanently deleted."
					+ "\nAre you sure you want to delete this channel?", {
                "CANCEL":function(){},
                "DELETE CHANNEL": function(){
					self.save({"deleted":true}, "Deleting Channel...").then(function(){
						self.containing_list_view.set_editing(false);
						self.containing_list_view.collection.remove(self.model);
						self.containing_list_view.render();
						self.containing_list_view.handle_channel_change(self.model, true);
					});
                },
            }, null);
            self.cancel_actions(event);
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
		if(this.validate()){
			this.containing_list_view.set_editing(false);
			this.set_is_new(false);
			var title = this.$el.find("#new_channel_name").val().trim();
			var description = this.$el.find("#new_channel_description").val();
			var data = {
				name: title,
				description: description,
				thumbnail : this.thumbnail,
				editors: this.model.get('editors'),
				pending_editors: this.model.get('pending_editors')
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
		}
	},
	validate:function(){
		if(!this.$("#new_channel_name").val().length){
			this.show_error(true);
			return false;
		}
		return true;
	},
	set_channel:function(){
		this.set({
			name: (this.$el.find("#new_channel_name").val().trim() == "")? "[Untitled Channel]" : this.$el.find("#new_channel_name").val().trim(),
			description: this.$el.find("#new_channel_description").val(),
			thumbnail : this.thumbnail
		});
	},
	reset_thumbnail:function(){
		this.set_channel();
		this.render();
		this.enable_submit();
	},
	remove_thumbnail:function(){
		this.thumbnail = null;
		this.thumbnail_url = "/static/img/kolibri_placeholder.png";
		this.set_channel();
		this.enable_submit();
	},
	set_thumbnail:function(thumbnail, formatted_name, path){
		this.thumbnail = formatted_name;
		this.thumbnail_url = path;
		this.set_channel();
		this.enable_submit();
	},
	set_editing: function(edit_mode_on){
		this.containing_list_view.set_editing(edit_mode_on);
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