var Backbone = require("backbone");
var _ = require("underscore");
require("channel_create.less");
var Dropzone = require("dropzone");
require("dropzone/dist/dropzone.css");
var Models = require("edit_channel/models");
var BaseViews = require("edit_channel/views");
var ImageViews = require("edit_channel/image/views");
var DetailView = require('edit_channel/details/views');
var get_cookie = require("utils/get_cookie");
var stringHelper = require("edit_channel/utils/string_helper")
var dialog = require("edit_channel/utils/dialog");

var NAMESPACE = "newChannel";
var MESSAGES = {
	"channel": "Channel",
	"header": "My Channels",
	"starred": "Starred",
	"public": "Public",
	"add_channel_title": "Create a new channel",
	"pending_loading": "Checking for invitations...",
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
	"view_channel": "View Details",
	"star_channel": "Star Channel",
	"unstar_channel": "Remove Star",
	"viewonly": "View-Only",
	"last_updated": "Updated {updated}",
	"starred_channel": "Star Added!",
	"unstarred_channel": "Star Removed",
	"create": "Create",
	"channel_title_prompt": "('CTRL' or 'CMD' + click to open in new tab)",
	"channel_detail_prompt": "Select a channel to view details",
	"channel_details": "About this Channel",
	"open_channel": "Open Channel",
	"save": "SAVE",
    "dont_save": "Discard Changes",
    "keep_open": "Keep Editing",
}

var ChannelListPage  = BaseViews.BaseView.extend({
	template: require("./hbtemplates/channel_create.handlebars"),
	list_selector: "#channel_list",
	name: NAMESPACE,
	$trs: MESSAGES,
	initialize: function(options) {
		_.bindAll(this, 'new_channel', 'set_all_models', 'toggle_panel');
		this.open = false;
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
		'click .new_channel_button' : 'new_channel',
		"click #close_details": "close_details"
	},
	new_channel: function(){
		if (this.current_channel_list.new_channel){
			this.current_channel_list.new_channel();
		}
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
		this.toggle_panel();
	},
	remove_star: function(channel){
		this.starred_channel_list.remove_channel(channel);
		this.set_all_models(channel);
	},
	set_active_channel(channel) {
		this.$el.removeClass("active_channel");
		this.starred_channel_list.set_active_channel(channel);
		this.current_channel_list.set_active_channel(channel);
		this.public_channel_list.set_active_channel(channel);
		this.viewonly_channel_list.set_active_channel(channel);
	},
	set_all_models: function(channel){
		this.starred_channel_list.set_model(channel);
		this.current_channel_list.set_model(channel);
		this.public_channel_list.set_model(channel);
		this.viewonly_channel_list.set_model(channel);
	},
	close_details: function() {
		this.toggle_panel()
	},
	toggle_panel: function(view, channel_list_item) {
		// Toggle channel details panel
		if(!this.current_view || !this.current_view.changed || !this.open) {
			this.set_details(view, channel_list_item);
        } else {
            var self = this;
            dialog.dialog(this.get_translation("unsaved_changes"), this.get_translation("unsaved_changes_text"), {
                [self.get_translation("dont_save")]: function(){
                    self.set_details(view, channel_list_item);
                },
                [self.get_translation("keep_open")]:function(){},
                [self.get_translation("save")]:function(){
                    self.current_view.submit_changes();
                    self.set_details(view, channel_list_item);
                },
            }, null);
        }
	},
	set_details: function(view, channel_list_item) {
		// Render channel details
		$(".active_channel").removeClass("active_channel");
		if(view) {
			this.current_view && this.current_view.remove();
			view.render(); // Calling separately to make background stay the same if user selects "KEEP EDITING" option
			if(!this.open) {
				this.open = true;
	   			this.$("#channel_preview_wrapper").animate({ width: 650 }, 500);
	   			this.$("#channel_list_wrapper").addClass("show-panel");
			}
			this.current_view = view;
    		$("#channel_details_panel").html(view.el);
    		channel_list_item && this.set_active_channel(channel_list_item);
		} else if(this.open) {
			this.open = false;
   			this.$("#channel_preview_wrapper").animate({ width: 0 }, 500);
   			this.$("#channel_list_wrapper").removeClass("show-panel");
		}
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
		_.bindAll(this, "add_channel", "delete_channel", "save_new_channel");
		this.container = options.container;
		this.collection = options.collection;
		this.render();
	},
	render: function() {
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
	save_new_channel: function(channel) {
		var view = this.add_channel(channel);
		view.open_channel();
	},
	add_channel: function(channel){
		if(!this.collection.findWhere({id: channel.id})) {
			this.collection.add(channel);
			var newView = this.create_new_view(channel);
			newView.$el.css('display', 'none');
			newView.$el.fadeIn(300);
			this.$(this.list_selector).prepend(newView.el);
			this.$(".default-item").css('display', 'none');
			return newView;
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
	set_active_channel: function(channel) {
		// Show channel as being opened across lists
		_.each(this.views, function(view){
			if(view.model.id === channel.id) {
				view.$el.addClass("active_channel");
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
		var preferences = (typeof window.user_preferences === "string")? JSON.parse(window.user_preferences) : window.user_preferences;

		var data = {
			editors: [window.current_user.id],
			pending_editors: [],
			language: window.user_preferences.language,
			content_defaults: preferences
		};
		var detail_view = new DetailView.ChannelDetailsView({
			model: new Models.ChannelModel(data),
			allow_edit: true,
			onnew: this.save_new_channel,
			onclose: this.container.toggle_panel
		});
		this.container.toggle_panel(detail_view);
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
		_.bindAll(this, 'delete_channel', 'star_channel', 'unstar_channel', 'set_star_icon', 'set_model');
		this.listenTo(this.model, "sync", this.set_model);
		this.containing_list_view = options.containing_list_view;
		this.container = options.container;
		this.can_edit = this.model.get("editors").indexOf(window.current_user.id) >= 0;
		this.render();
	},
	set_is_new:function(isNew){
		this.isNew = isNew;
	},
	set_model: function(data) {
		this.container.set_all_models(this.model);
	},
	render: function() {
		this.$el.html(this.template({
			can_edit: this.can_edit,
			channel: this.model.toJSON(),
			total_file_size: this.model.get("size"),
			resource_count: this.model.get("count"),
			channel_link : this.model.get("id"),
			picture : (this.model.get("thumbnail_encoding") && this.model.get("thumbnail_encoding").base64) || this.model.get("thumbnail_url"),
			modified: this.model.get("modified") || new Date(),
			languages: window.languages.toJSON(),
			language: window.languages.findWhere({id: this.model.get("language")}),
			new: this.isNew
		}, {
			data: this.get_intl_data()
		}));
		this.$('[data-toggle="tooltip"]').tooltip();
	},
	events: {
		'click .star_channel': 'star_channel',
		'click .unstar_channel': 'unstar_channel',
		'mouseover .channel_option_icon':'remove_highlight',
		'mouseover .copy-id-btn':'remove_highlight',
		'click .copy-id-btn' : 'copy_id',
		'click .open_channel': 'open_channel',
		'mouseover .open_channel': 'add_highlight',
		'mouseleave .open_channel': 'remove_highlight'
	},
	remove_highlight:function(event){
		event.stopPropagation();
		event.preventDefault();
		this.$el.removeClass('highlight');
	},
	add_highlight:function(event){
		this.$el.addClass('highlight');
	},
	open_channel:function(event){
		if(!event || this.$el.hasClass('highlight')){
			if (event && (event.metaKey || event.ctrlKey)) {
				var open_url = '/channels/' + this.model.get("id") + ((this.can_edit)? '/edit' : '/view');
				window.open(open_url, '_blank');
			} else if(!this.$el.hasClass('active_channel')) {
				var detail_view = new DetailView.ChannelDetailsView({
					model: this.model,
					allow_edit: this.can_edit,
					ondelete: this.delete_channel,
					onstar: this.star_channel,
					onunstar: this.unstar_channel
				});
				this.container.toggle_panel(detail_view, this.model);
			}
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
			self.$(".copy-id-btn").text("check");
		} catch(e) {
			self.$(".copy-id-btn").text("clear");
		}
		setTimeout(function(event){
			self.$(".copy-id-btn").text("content_paste");
		}, 2500);
	},
	star_channel: function(event, star_icon){
		var self = this;
		this.model.add_bookmark(window.current_user.id).then(function() {
			self.model.set("is_bookmarked", true);
			self.render();
			self.set_star_icon(self.get_translation("unstar_channel"), star_icon);
			self.container.add_channel(self.model, "star");
		});
	},
	unstar_channel: function(event, star_icon){
		var self = this;
		this.model.remove_bookmark(window.current_user.id).then(function() {
			self.model.set("is_bookmarked", false);
			self.render();
			self.set_star_icon(self.get_translation("star_channel"), star_icon);
			self.container.remove_star(self.model);
		});
	},
	set_star_icon: function(new_message, star_icon){
		star_icon = star_icon || this.$(".star_option");
		star_icon.tooltip("hide");

		// Keep channel details in sync with channel list
		$("#channel_details_view_panel .star_icon").html(this.$(".star_option").html());
		$("#channel_details_view_panel .star_icon").attr("data-original-title", new_message);
		this.$(".star_option").attr("data-original-title", new_message);
	},
	delete_channel: function(model){
		this.container.delete_channel(this.model);
	}
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
