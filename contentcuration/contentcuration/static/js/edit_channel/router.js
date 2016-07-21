var _ = require("underscore");
var Backbone = require("backbone");
var Models = require("./models");
var Views = require("./views");
var ChannelManageView = require("edit_channel/new_channel/views");

//var saveDispatcher = _.clone(Backbone.Events);

ChannelEditRouter  = Backbone.Router.extend({
	nodeCollection: new Models.ContentNodeCollection(),
    initialize: function(options) {
        _.bindAll(this, "navigate_channel_home", "preview_page", "edit_page", "clipboard_page");
		this.nodeCollection = new Models.ContentNodeCollection();
		this.nodeCollection.fetch();
		window.licenses = new Models.LicenseCollection(window.license_list);
		window.current_channel = new Models.ChannelModel(window.channel);
		window.current_user = new Models.UserModel(window.user);
		//this.listenTo(saveDispatcher, "save", this.save);
		this.channelCollection = new Models.ChannelCollection(window.channels);

		this.fileformats = new Models.FileFormatCollection(window.fformats);
		this.fileformats.fetch({cache:true});
		this.formatpresets = new Models.FormatPresetCollection(window.presets);
		this.formatpresets.fetch({cache:true});
		this.contentkinds = new Models.ContentKindCollection(window.kinds);
		this.contentkinds.fetch({cache:true});
    },

    routes: {
		"": "navigate_channel_home",
		":channel/edit": "edit_page",
		":channel/preview": "preview_page",
		":channel/clipboard": "clipboard_page"
    },

	navigate_channel_home: function() {
		var channel_manager_view = new ChannelManageView.ChannelList ({
			el: $("#channel-container"),
			channels: this.channelCollection,
			licenses:window.licenses
		});
    },

	edit_page : function(){
		this.open_channel(true, false, window.current_channel.get_root("main_tree"));
	},
	preview_page : function(){
		this.open_channel(false, false, window.current_channel.get_root("main_tree"));
	},
	clipboard_page:function(){
		this.open_channel(true, true, window.current_user.get_clipboard());
	},

	open_channel: function(edit_mode_on, is_clipboard, root){
		window.fileformats = this.fileformats ;
		window.channels = this.channelCollection;
		window.formatpresets = this.formatpresets;
		window.contentkinds = this.contentkinds;
		window.contenttags = new Models.TagCollection(window.channel_tags);
		window.access_channels = new Models.ChannelCollection(window.accessible_channels);

		var EditViews = require("edit_channel/tree_edit/views");
		var edit_page_view = new EditViews.TreeEditView({
			el: $("#main-content-area"),
			collection: this.nodeCollection,
			edit: edit_mode_on,
			model : root,
			is_clipboard : is_clipboard,
		});

	}
});

module.exports = ChannelEditRouter;