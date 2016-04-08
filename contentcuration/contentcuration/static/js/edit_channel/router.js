var _ = require("underscore");
var Backbone = require("backbone");
var Models = require("./models");
var Views = require("./views");
var ChannelManageView = require("edit_channel/new_channel/views");

//var saveDispatcher = _.clone(Backbone.Events);

ChannelEditRouter  = Backbone.Router.extend({
	nodeCollection: new Models.NodeCollection(),
    initialize: function(options) {
        _.bindAll(this, "navigate_channel_home", "preview_page", "edit_page", "clipboard_page");
		this.user = options.user;
		this.model = options.model;
		this.nodeCollection = new Models.NodeCollection();
		this.nodeCollection.fetch();
		window.licenses = new Models.LicenseCollection(window.license_list);
		window.licenses.fetch();
		window.licenses.create_licenses();
		//this.listenTo(saveDispatcher, "save", this.save);
    },
	
    routes: {
		"": "navigate_channel_home",
		":channel/edit": "edit_page", 
		":channel/preview": "preview_page",
		":channel/clipboard": "clipboard_page"
    },

	navigate_channel_home: function() {
		this.channelCollection = new Models.ChannelCollection();
		this.channelCollection.fetch();

		var channel_manager_view = new ChannelManageView.ChannelList ({
			el: $("#channel-container"),
			model: this.model,
			channels: this.channelCollection,
			user: this.user,
			licenses:window.licenses
		});
		
    },
	
	edit_page : function(){
		this.open_channel(true, false, window.current_channel.get_tree("draft").get_root());
	},
	preview_page : function(){
		this.open_channel(false, false, window.current_channel.get_tree("draft").get_root());
	},
	clipboard_page:function(){
		this.open_channel(true, true, window.current_channel.get_tree("clipboard").get_root());
	},

<<<<<<< HEAD
	open_channel: function(edit_mode_on){
		var topictrees = new Models.TopicTreeModelCollection(window.topic_trees);
		topictrees.fetch();
		window.mimetypes = new Models.MimeTypeCollection(window.mtypes);
		window.mimetypes.fetch();
		window.mimetypes.create_mimetypes();
		

=======
	open_channel: function(edit_mode_on, is_clipboard, root){
>>>>>>> 3f016463678668c047c96803884f94ba7614f270
		var EditViews = require("edit_channel/tree_edit/views");
		var edit_page_view = new EditViews.TreeEditView({
			el: $("#main-content-area"),
			edit: edit_mode_on,
			collection: this.nodeCollection,
			model : root,
			is_clipboard : is_clipboard
		});
	}
});

module.exports = ChannelEditRouter;