var _ = require("underscore");
var Backbone = require("backbone");
var Models = require("./models");
var Views = require("./views");
var ChannelManageView = require("edit_channel/new_channel/views");

//var saveDispatcher = _.clone(Backbone.Events);

ChannelEditRouter  = Backbone.Router.extend({
	nodeCollection: new Models.NodeCollection(),
    initialize: function(options) {
        _.bindAll(this, "navigate_channel_home", "edit_page");
		this.user = options.user;
		this.model = options.model;
		
		//this.listenTo(saveDispatcher, "save", this.save);
    },
	
    routes: {
		"": "navigate_channel_home",
		":channel/edit": "edit_page", 
		":channel/preview": "edit_page",
    },

	navigate_channel_home: function() {
		this.channelCollection = new Models.ChannelCollection();
		this.channelCollection.fetch();
		var channel_manager_view = new ChannelManageView.ChannelList ({
			el: $("#channel-container"),
			model: this.model,
			channels: this.channelCollection
		});
		
    },
	
	edit_page : function(){
		//var curr_channel = new Models.ChannelModel(window.current_channel);
		//curr_channel.fetch();
		var topictrees = new Models.TopicTreeModelCollection(window.topic_trees);
		topictrees.fetch();
		this.nodeCollection = new Models.NodeCollection();
		this.nodeCollection.fetch();
		var EditViews = require("edit_channel/tree_edit/views");
		var edit_page_view = new EditViews.TreeEditView({
			el: $("#main-content-area"),
			edit: Backbone.history.getFragment().includes("edit"),
			collection: this.nodeCollection,
			topictrees: topictrees
		});
	},
});

module.exports = ChannelEditRouter;