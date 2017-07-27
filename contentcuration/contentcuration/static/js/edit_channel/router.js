var _ = require("underscore");
var Backbone = require("backbone");
var Models = require("./models");
var Views = require("./views");
var WorkspaceManager = require("./utils/workspace_manager");

//var saveDispatcher = _.clone(Backbone.Events);

var ChannelEditRouter  = Backbone.Router.extend({
  nodeCollection: new Models.ContentNodeCollection(),
  initialize: function(options) {
    _.bindAll(this, "navigate_channel_home", "preview_page", "edit_page", "clipboard_page", "admin_page");
		this.nodeCollection = new Models.ContentNodeCollection();
		window.current_channel = new Models.ChannelModel(window.channel);
		window.current_user = new Models.UserModel(window.user);
		window.workspace_manager = new WorkspaceManager();
		//this.listenTo(saveDispatcher, "save", this.save);
		this.channelCollection = new Models.ChannelCollection();

		this.fileformats = new Models.FileFormatCollection(window.fformats);
		this.formatpresets = new Models.FormatPresetCollection(window.presets);
		this.contentkinds = new Models.ContentKindCollection(window.kinds);
		this.languages = new Models.LanguageCollection(window.langs);
  },

  routes: {
		"": "navigate_channel_home",
		"administration/": "admin_page",
		":channel/edit": "edit_page",
		":channel/staging": "staging_page",
		":channel/view": "preview_page",
		":channel/clipboard": "clipboard_page"
  },

	navigate_channel_home: function() {
		var ChannelManageView = require("edit_channel/new_channel/views");
		var channel_manager_view = new ChannelManageView.ChannelListPage ({
			el: $("#channel-container"),
			collection: this.channelCollection
		});
	},

	admin_page: function(){
		var AdministrationView = require("edit_channel/admin/views");
		var admin_view = new AdministrationView.AdminView ({
			el: $("#admin-container")
		});
	},

	edit_page : function(){
		var data = { "edit_mode_on" : true };
		this.open_channel(data, window.current_channel.get_root("main_tree"));
	},
	staging_page: function(){
		var data = { "edit_mode_on" : true, "is_staging" : true };
		this.open_channel(data, window.current_channel.get_root("staging_tree"));
	},
	preview_page : function(){
		var data = {};
		this.open_channel(data, window.current_channel.get_root("main_tree"));
	},
	clipboard_page:function(){
		var data = { "edit_mode_on" : true, "is_clipboard" : true };
		this.open_channel(true, true, false, window.current_user.get_clipboard());
	},
	open_channel: function(data, root){
		window.staging = data.is_staging || false;
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
			edit: data.edit_mode_on && !window.current_channel.get('ricecooker_version'),
			model : root,
			is_clipboard : data.is_clipboard || false,
			staging: window.staging
		});
		if(!window.is_staging){
			var QueueView = require("edit_channel/queue/views");
			var queue = new QueueView.Queue({
		 		el: $("#queue-area"),
		 		collection: this.nodeCollection,
		 		clipboard_root : window.current_user.get_clipboard(),
				trash_root : window.current_channel.get_root("trash_tree"),
		 	});
		}
	}
});

module.exports = ChannelEditRouter;
