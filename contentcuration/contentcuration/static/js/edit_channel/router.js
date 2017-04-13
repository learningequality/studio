var _ = require("underscore");
var Backbone = require("backbone");
var Models = require("./models");
var Views = require("./views");
var WorkspaceManager = require("./utils/workspace_manager");

//var saveDispatcher = _.clone(Backbone.Events);

ChannelEditRouter  = Backbone.Router.extend({
  nodeCollection: new Models.ContentNodeCollection(),
  initialize: function(options) {
    _.bindAll(this, "navigate_channel_home", "preview_page", "edit_page", "clipboard_page");
		this.nodeCollection = new Models.ContentNodeCollection();
		window.current_channel = new Models.ChannelModel(window.channel);
		window.current_user = new Models.UserModel(window.user);
		window.workspace_manager = new WorkspaceManager();
		//this.listenTo(saveDispatcher, "save", this.save);
		this.channelCollection = new Models.ChannelCollection(window.channels);

		this.fileformats = new Models.FileFormatCollection(window.fformats);
		this.formatpresets = new Models.FormatPresetCollection(window.presets);
		this.contentkinds = new Models.ContentKindCollection(window.kinds);
		this.languages = new Models.LanguageCollection(window.langs);
  },

  routes: {
		"": "navigate_channel_home",
		":channel/edit": "edit_page",
		":channel/view": "preview_page",
		":channel/clipboard": "clipboard_page"
  },

	navigate_channel_home: function() {
		var ChannelManageView = require("edit_channel/new_channel/views");
		var channel_manager_view = new ChannelManageView.ChannelList ({
			el: $("#channel-container"),
			collection: this.channelCollection
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
		window.languages = this.languages;
		window.contentkinds = this.contentkinds;
		window.contenttags = new Models.TagCollection(window.current_channel.get('tags'));
		window.licenses = new Models.LicenseCollection(window.license_list);

		var EditViews = require("edit_channel/tree_edit/views");
		var edit_page_view = new EditViews.TreeEditView({
			el: $("#main-content-area"),
			collection: this.nodeCollection,
			edit: edit_mode_on,
			model : root,
			is_clipboard : is_clipboard,
		});
		var QueueView = require("edit_channel/queue/views");
		var queue = new QueueView.Queue({
	 		el: $("#queue-area"),
	 		collection: this.nodeCollection,
	 		clipboard_root : window.current_user.get_clipboard(),
			trash_root : window.current_channel.get_root("trash_tree"),
	 	});
	}
});

module.exports = ChannelEditRouter;