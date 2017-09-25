var Backbone = require("backbone");
var _ = require("underscore");
require("channel_create.less");
var Dropzone = require("dropzone");
require("dropzone/dist/dropzone.css");
var Models = require("edit_channel/models");
var BaseViews = require("edit_channel/views");
var ImageViews = require("edit_channel/image/views");
var get_cookie = require("utils/get_cookie");
var stringHelper = require("edit_channel/utils/string_helper")
var dialog = require("edit_channel/utils/dialog");

var NAMESPACE = "newChannel";
var MESSAGES = {
	"channel": "Channel",
	"header": "My Channels",
	"starred": "Starred",
	"public": "Public",
	"add_channel_disbaled_title": "Cannot create a new channel while another channel is being edited.",
	"add_channel_title": "Create a new channel",
	"pending_loading": "Checking for invitations...",
	"delete_channel": "DELETE CHANNEL",
	"save_channel": "SAVE",
	"deleting_channel": "Deleting Channel...",
	"delete_warning": "All content under this channel will be permanently deleted.\nAre you sure you want to delete this channel?",
	"channel_name_error": "Channel must have a name",
	"name_placeholder": "Enter channel name...",
	"description_placeholder": "Enter channel description...",
	"copy_id": "Copy ID to clipboard",
	"unpublished": "Unpublished",
	"view_only": "View Only",
	"invitation_error": "Invitation Error",
	"declining_invitation": "Declining Invitation",
	"declining_invitation_message": "Are you sure you want to decline this invitation?",
	"decline": "DECLINE",
	"accept": "ACCEPT",
	"accept_prompt": "has invited you to",
	"accept_success": "Accepted invitation to",
	"decline_success": "Declined invitation to",
	"edit": "edit",
	"view": "view",
	"edit_channel": "Edit Details",
	"star_channel": "Star Channel",
	"unstar_channel": "Remove Star",
	"viewonly": "View-Only",
	"last_updated": "Updated {updated}",
	"starred_channel": "Star Added!",
	"unstarred_channel": "Star Removed",
	"create": "Create"
}

var ChannelListPage  = BaseViews.BaseView.extend({
	template: require("./hbtemplates/channel_create.handlebars"),
	list_selector: "#channel_list",
	name: NAMESPACE,
	$trs: MESSAGES,
	initialize: function(options) {
		_.bindAll(this, 'new_channel', 'set_all_models');
		this.render();
	},
	render: function() {
		this.$el.html(this.template(null, {
			data: this.get_intl_data()
		}));
		this.pending_channel_list = new PendingChannelList({container: this, el: this.$("#pending_list")});
		var self = this;
		window.current_user.get_channels().then(function(channels){
			self.current_channel_list = new CurrentChannelList({
				container: self,
				el: self.$("#channel_list"),
				collection: channels
			});
		});
		window.current_user.get_bookmarked_channels().then(function(channels){
			self.starred_channel_list = new StarredChannelList({
				container: self,
				el: self.$("#starred_list"),
				collection: channels
			});
		});
		window.current_user.get_public_channels().then(function(channels){
			self.public_channel_list = new PublicChannelList({
				container: self,
				el: self.$("#public_list"),
				collection: channels
			});
		});
		window.current_user.get_view_only_channels().then(function(channels){
			self.viewonly_channel_list = new ViewOnlyChannelList({
				container: self,
				el: self.$("#viewonly_list"),
				collection: channels
			});
		});
	},
	events: {
		'click .new_channel_button' : 'new_channel'
	},
	new_channel: function(){
		this.current_channel_list.new_channel();
	},
	add_channel: function(channel, category){
		switch(category){
			case "edit":
				this.current_channel_list.add_channel(channel);
				this.$('#manage-channel-nav a[href="#channels"]').tab('show');
				break;
			case "view":
				this.viewonly_channel_list.add_channel(channel);
				this.$('#manage-channel-nav a[href="#viewonly"]').tab('show');
				break;
			case "star":
				this.starred_channel_list.add_channel(channel);
				break;
		}
		this.set_all_models(channel);
	},
	delete_channel: function(channel){
		this.starred_channel_list.delete_channel(channel);
		this.current_channel_list.delete_channel(channel);
		this.public_channel_list.delete_channel(channel);
		this.viewonly_channel_list.delete_channel(channel);
	},
	remove_star: function(channel){
		this.starred_channel_list.remove_channel(channel);
		this.set_all_models(channel);
	},
	set_all_models: function(channel, current_page){
		this.starred_channel_list.set_model(channel, current_page);
		this.current_channel_list.set_model(channel, current_page);
		this.public_channel_list.set_model(channel, current_page);
		this.viewonly_channel_list.set_model(channel, current_page);
	}
});

var ChannelList  = BaseViews.BaseEditableListView.extend({
	template: require("./hbtemplates/channel_list.handlebars"),
	list_selector: ".channel_list",
	default_item: ".default-item",
	name: NAMESPACE,
	$trs: MESSAGES,
	initialize: function(options) {
		this.bind_edit_functions();
		this.container = options.container;
		this.collection = options.collection;
		this.render();
	},
	render: function() {
		this.set_editing(false);
		this.$el.html(this.template(null, {
			data: this.get_intl_data()
		}));
		this.load_content();
	},
	create_new_view:function(data){
		var newView = new ChannelListItem({
			model: data,
			containing_list_view: this,
			container: this.container
		});
		this.views.push(newView);
		return newView;
	},
	set_editing: function(edit_mode_on){
		$(".disable-on-edit").prop("disabled", edit_mode_on);
		$(".disable-on-edit").css("cursor", (edit_mode_on) ? "not-allowed" : "pointer");
		$(".invisible-on-edit").css('visibility', (edit_mode_on)?'hidden' : 'visible');
		(edit_mode_on)? $(".new_channel_button").addClass("disabled") : $(".new_channel_button").removeClass("disabled");
		$(".new_channel_button").prop("title", (edit_mode_on)? this.get_translation("add_channel_disbaled_title") : this.get_translation("add_channel_title"));
	},
	add_channel: function(channel){
		if(!this.collection.findWhere({id: channel.id})) {
			this.collection.add(channel);
			var newView = this.create_new_view(channel);
			newView.$el.css('display', 'none');
			newView.$el.fadeIn(300);
			this.$(this.list_selector).prepend(newView.el);
			this.$(".default-item").css('display', 'none');
		}
	},
	remove_channel: function(channel) {
		this.collection.remove(channel);
		this.render();
	},
	set_model: function(channel){
		_.each(this.views, function(view){
			if(view.model.id === channel.id) {
				view.model.set(channel.toJSON());
				view.render();
			}
		});
	},
	delete_channel: function(channel){
		this.collection.remove(channel);
		this.render();
	}
});

var CurrentChannelList  = ChannelList.extend({
	new_channel: function(){
		var data = {
			editors: [window.current_user.id],
			pending_editors: [],
			language: window.user_preferences.language
		};
		var newView = this.create_new_view(new Models.ChannelModel(data));
		this.$(this.list_selector).prepend(newView.el);
		this.$(".default-item").css('display', 'none');
		newView.edit_channel();
		newView.set_is_new(true);
	}
});

var StarredChannelList  = ChannelList.extend({});

var PublicChannelList  = ChannelList.extend({});

var ViewOnlyChannelList  = ChannelList.extend({});

var ChannelListItem = BaseViews.BaseListEditableItemView.extend({
	name: NAMESPACE,
	$trs: MESSAGES,
	tagName: "li",
	id: function(){
		return (this.model)? this.model.get("id") : "new";
	},
	className:"channel_container",
	template: require("./hbtemplates/channel_item.handlebars"),
	initialize: function(options) {
		this.bind_edit_functions();
		_.bindAll(this, 'edit_channel','delete_channel','toggle_channel','save_channel','update_title', 'loop_focus', 'copy_id', 'set_indices',
						'open_channel', 'set_thumbnail', 'reset_thumbnail','enable_submit', 'disable_submit', 'remove_thumbnail', 'set_star_icon');
		this.listenTo(this.model, "sync", this.render);
		this.edit = false;
		this.containing_list_view = options.containing_list_view;
		this.container = options.container;
		this.original_thumbnail = this.model.get("thumbnail");
		this.original_thumbnail_url = this.model.get("thumbnail_url");
		this.original_thumbnail_encoding = this.model.get("thumbnail_encoding");
		this.thumbnail_encoding = this.original_thumbnail_encoding;
		this.thumbnail_url = this.original_thumbnail_url;
		this.thumbnail = this.original_thumbnail;
		this.originalData = (this.model)? this.model.toJSON() : null;
		this.can_edit = this.model.get("editors").indexOf(window.current_user.id) >= 0;
		this.dropzone = null;
		this.isNew = false;
		this.thumbnail_success = true;
		this.render();
	},
	get_post_translations: function(){
		return {};
	},

	set_is_new:function(isNew){
		this.isNew = isNew;
		if (this.isNew){
			this.$(".save_channel").attr("disabled", "disabled");
			this.$(".save_channel").prop("disabled", true);
			this.$(".save_channel").css("cursor", "not-allowed");
			this.render();
		}
	},
	render: function() {
		this.$el.html(this.template({
			can_edit: this.can_edit,
			edit: this.edit,
			channel: this.model.toJSON(),
			total_file_size: this.model.get("size"),
			resource_count: this.model.get("count"),
			channel_link : this.model.get("id"),
			picture : (this.thumbnail_encoding && this.thumbnail_encoding.base64) || this.thumbnail_url,
			modified: this.model.get("modified") || new Date(),
			languages: window.languages.toJSON(),
			language: window.languages.findWhere({id: this.model.get("language")}),
			new: this.isNew
		}, {
			data: this.get_intl_data()
		}));
		if(this.edit){
			this.image_upload = new ImageViews.ThumbnailUploadView({
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
				allow_edit: true,
				is_channel: true
			});
			this.$("#select_language").val(this.model.get("language") || 0);
		}
		this.$('[data-toggle="tooltip"]').tooltip();
		this.set_indices();
		this.set_initial_focus();
	},
	events: {
		'click .edit_channel':'edit_channel',
		'click .star_channel': 'star_channel',
		'click .unstar_channel': 'unstar_channel',
		'mouseover .channel_option_icon':'remove_highlight',
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
		if(this.$('.channel-container-wrapper').hasClass('highlight')){
			window.location.href = '/channels/' + this.model.get("id") + ((this.can_edit)? '/edit' : '/view');
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
	star_channel: function(){
		var self = this;
		this.model.add_bookmark(window.current_user.id).then(function() {
			self.model.set("is_bookmarked", true);
			self.render();
			self.set_star_icon(self.get_translation("starred_channel"), self.get_translation("unstar_channel"));
			self.container.add_channel(self.model, "star");
		});
	},
	unstar_channel: function(){
		var self = this;
		this.model.remove_bookmark(window.current_user.id).then(function() {
			self.model.set("is_bookmarked", false);
			self.render();
			self.set_star_icon(self.get_translation("unstarred_channel"), self.get_translation("star_channel"));
			self.container.remove_star(self.model);
		});
	},
	set_star_icon: function(temporary_message, new_message){
		this.$(".star_option").attr("data-original-title", temporary_message);
		this.$(".star_option").tooltip("show");
		var self = this;
		setTimeout(function(){
			self.$(".star_option").attr("data-original-title", new_message);
			self.$(".star_option").tooltip("hide");
		}, 2000);
	},
	delete_channel: function(event){
		if(this.isNew){
			this.delete(true, " ");
			this.containing_list_view.set_editing(false);
			this.remove();
		}else{
			var self = this;
			dialog.dialog(this.get_translation("warning"), this.get_translation("delete_warning", this.model.get("name")), {
				[this.get_translation("cancel")]:function(){},
				[this.get_translation("delete_channel")]: function(){
					self.save({"deleted":true}, self.get_translation("deleting_channel")).then(function(){
						self.containing_list_view.set_editing(false);
						self.container.delete_channel(self.model);
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
		this.thumbnail_encoding = this.original_thumbnail_encoding;
		this.containing_list_view.set_editing(false);
		if(this.isNew){
			this.delete(true, " ");
			this.remove();
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
			var language = window.languages.findWhere({id: this.$el.find("#select_language").val()});
			var data = {
				name: title,
				description: description,
				thumbnail : this.thumbnail,
				thumbnail_encoding: this.thumbnail_encoding,
				editors: this.model.get('editors'),
				preferences: JSON.stringify(this.model.get('preferences') || window.user_preferences),
				language: this.$el.find("#select_language").val(),
				pending_editors: this.model.get('pending_editors') || [],
			};
			this.original_thumbnail = this.thumbnail;
			this.original_thumbnail_url = this.thumbnail_url;
			this.edit = false;

			var self = this;
			this.save(data, this.get_translation("saving")).then(function(channel){
				self.model = channel;
				self.render();
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
			name: this.$el.find("#new_channel_name").val().trim(),
			description: this.$el.find("#new_channel_description").val(),
			thumbnail : this.thumbnail,
			thumbnail_encoding: this.thumbnail_encoding
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
		this.thumbnail_encoding = null;
		this.set_channel();
		this.enable_submit();
	},
	set_thumbnail:function(thumbnail, encoding, formatted_name, path){
		this.thumbnail = formatted_name;
		this.thumbnail_url = path;
		this.thumbnail_encoding = encoding;
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

var PendingChannelList  = ChannelList.extend({
	template: require("./hbtemplates/channel_list_pending.handlebars"),
	list_selector: "#channel_list_pending",
	initialize: function(options) {
		this.bind_edit_functions();
		this.container = options.container;
		this.collection = new Models.InvitationCollection();
		this.render();
	},
	render: function() {
		this.$el.html(this.template(null, {
			data: this.get_intl_data()
		}));
		var self = this;
		window.current_user.get_pending_invites().then(function(invitations){
			self.collection.reset(invitations.toJSON());
			self.load_content(self.collection, " ");
		});
	},
	create_new_view:function(data){
		var newView = new ChannelListPendingItem({
			model: data,
			containing_list_view: this,
		});
		this.views.push(newView);
		return newView;
	},
	invitation_submitted: function(invitation, channel){
		this.collection.remove(invitation);
		if(channel){
			this.container.add_channel(channel, invitation.get("share_mode"));
		}
	}
});

var ChannelListPendingItem = BaseViews.BaseListEditableItemView.extend({
	name: NAMESPACE,
	$trs: MESSAGES,
	tagName: "li",
	id: function(){
		return (this.model)? this.model.get("id") : "new";
	},
	className:"pending_container",
	template: require("./hbtemplates/channel_item_pending.handlebars"),
	initialize: function(options) {
		this.bind_edit_functions();
		_.bindAll(this, 'accept','decline', 'submit_invitation');
		this.listenTo(this.model, "sync", this.render);
		this.containing_list_view = options.containing_list_view;
		this.status = null;
		this.render();
	},
	render: function() {
		this.$el.html(this.template({
			invitation: this.model.toJSON(),
			status: this.status
		}, {
			data: this.get_intl_data()
		}));
	},
	events: {
		'click .accept_invite':'accept',
		'click .decline_invite':'decline'
	},
	accept: function(){
		var self = this;
		this.model.accept_invitation().then(function(channel){
			self.submit_invitation(true, channel);
		}).catch(function(error){
			dialog.alert(self.get_translation("invitation_error"), error.responseText);
		});
	},
	decline: function(){
		var self = this;
		dialog.dialog(self.get_translation("declining_invitation"), self.get_translation("declining_invitation_message"), {
			[self.get_translation("cancel")]:function(){},
			[self.get_translation("decline")]: function(){
				self.model.decline_invitation().then(function(){
					self.submit_invitation(false, null);
				});
			},
		}, function(){ });
	},
	submit_invitation: function(accepted, channel){
		// Show invitation was accepted
		this.status = {"accepted" : accepted};
		this.render();
		this.containing_list_view.invitation_submitted(this.model, channel)
	}
});

module.exports = {
	ChannelListPage : ChannelListPage
}