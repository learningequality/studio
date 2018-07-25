var _ = require("underscore");
var Backbone = require("backbone");
var Models = require("./models");
var Views = require("./views");
var WorkspaceManager = require("./utils/workspace_manager");

//var saveDispatcher = _.clone(Backbone.Events);
var URL_CHAR_LIMIT = 7;

var ChannelEditRouter  = Backbone.Router.extend({
  nodeCollection: new Models.ContentNodeCollection(),
  initialize: function(options) {
    _.bindAll(this, "navigate_channel_home", "preview_page", "edit_page", "clipboard_page", "admin_page");
		this.nodeCollection = new Models.ContentNodeCollection();
		window.current_channel = window.channel && new Models.ChannelModel(window.channel);
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
		":channel/edit(/:topic)(/:node)": "edit_page",
		":channel/staging(/:topic)(/:node)": "staging_page",
		":channel/view(/:topic)(/:node)": "preview_page",
		":channel/clipboard(/:topic)(/:node)": "clipboard_page"
  },

	navigate_channel_home: function() {
		window.fileformats = this.fileformats ;
		window.channels = this.channelCollection;
		window.formatpresets = this.formatpresets;
		window.contentkinds = this.contentkinds;
		window.licenses = new Models.LicenseCollection(window.license_list);
		window.languages = this.languages;
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

	edit_page : function(channel, topic, node){
		var data = { "edit_mode_on" : true, "topic": topic, "node": node, "page": "edit" };
		this.open_channel(data, window.current_channel.get_root("main_tree"));
	},
	staging_page: function(channel, topic, node){
		var data = { "edit_mode_on" : true, "is_staging" : true, "topic": topic, "node": node, "page": "staging"  };
		this.open_channel(data, window.current_channel.get_root("staging_tree"));
	},
	preview_page : function(channel, topic, node){
		var data = {"topic": topic, "node": node, "page": "view"};
		this.open_channel(data, window.current_channel.get_root("main_tree"));
	},
	clipboard_page:function(channel, topic, node){
		var data = { "edit_mode_on" : true, "is_clipboard" : true, "topic": topic, "node": node, "page": "clipboard" };
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
		window.preferences = (typeof window.preferences === "string")? JSON.parse(window.preferences) : window.preferences;

		data.topic = data.topic || window.current_channel.get((data.is_staging)? "staging_tree" : "main_tree").node_id;
		window.current_page = data.page;
		this.update_url(data.topic, data.node);

		var EditViews = require("edit_channel/tree_edit/views");
		var edit_page_view = new EditViews.TreeEditView({
			el: $("#main-content-area"),
			collection: this.nodeCollection,
			edit: data.edit_mode_on && !window.current_channel.get('ricecooker_version'),
			model : root,
			path: data,
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
	},
	update_url: function(topic, node, replacement){
		window.topic = topic || window.topic;
		window.node = node;
		var urlString = window.current_channel.id + "/" + window.current_page;
		urlString += (window.topic)? "/" + window.topic.substring(0, URL_CHAR_LIMIT) : "";
		urlString += (window.node) ? "/" + window.node.substring(0, URL_CHAR_LIMIT) : "";
		if(replacement) {
			document.title = replacement;
		}
		this.navigate(urlString, {replace: !replacement});
	}
});

module.exports = ChannelEditRouter;
