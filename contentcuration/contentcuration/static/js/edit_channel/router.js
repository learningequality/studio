var _ = require("underscore");
var Backbone = require("backbone");
var Models = require("./models");
var Views = require("./views");
var ChannelManageView = require("edit_channel/new_channel/views");
var ClipboardView = require("edit_channel/clipboard/views");

var current_tree;
//var saveDispatcher = _.clone(Backbone.Events);

ChannelEditRouter  = Backbone.Router.extend({
	nodeCollection: new Models.NodeCollection(),
    initialize: function(options) {
        _.bindAll(this, "navigate_channel_home", "edit_page", "preview_page", "trash_page");
		this.user = options.user;
		this.model = options.model;
		
		//this.listenTo(saveDispatcher, "save", this.save);
    },
	
    routes: {
		"": "navigate_channel_home",
		":channel/edit": "edit_page", 
		":channel/preview": "preview_page",
		":channel/trash": "trash_page"
    },

	navigate_channel_home: function() {
		this.channelCollection = new Models.ChannelCollection();
		this.channelCollection.fetch();
		var channel_manager_view = new ChannelManageView.ManageChannelsView ({
			el: $("#channel-container"),
			model: this.model,
			channels: this.channelCollection
		});
		
    },
	
	edit_page : function(){
		console.log("topic tree edit", window.topic_tree);
		var topictree = new Models.TopicTreeModelCollection(window.topic_tree);
		var root = new Models.NodeModel(window.root);
		root.fetch();
		this.nodeCollection.add(root);
		this.nodeCollection.fetch();
		var EditViews = require("edit_channel/tree_edit/views");
		var edit_page_view = new EditViews.TreeEditView({
			el: $("#main-content-area"),
			edit: true,
			root: root
		});
		if(!window.clipboard_view){
			window.clipboard_view = new ClipboardView.ClipboardListView({
		 		el: $("#clipboard-area"),
		 	});
		}
		 	
	},

	preview_page : function(channel){
		var topictree = new Models.TopicTreeModelCollection(window.topic_tree);
		var EditViews = require("edit_channel/tree_edit/views");
		var root = new Models.NodeModel(window.root);
		var preview_page_view = new EditViews.TreeEditView({
			el: $("#main-content-area"),
			edit: false,
			channel: topictree,
			root: root
		});
		
	},
	
	trash_page : function(channel){
		var topictree = new Models.TopicTreeModelCollection(window.topic_tree);
		var TrashViews = require("edit_channel/trash/views");
		var root = new Models.NodeModel(window.root);
		var trash_page_view = new TrashViews.TrashView({
			el: $("#main-content-area"),
			channel: topictree,
			root: root
		});
		
	},


/************************* DATABASE FUNCTIONS *************************/
	create_channel: function(data){
		var channel_data = new Models.ChannelModel(data);
		channel_data.fetch();
		this.channelCollection.create(channel_data, {
			success: function(){
				var root_node = new Models.NodeModel();
				root_node.save({title: channel_data.attributes.name}, {
					success: function(){
						var new_tree = new Models.TopicTreeModel({
							channel: channel_data.id, 
							root_node: root_node.id,
							title: channel_data.name
						});
						new_tree.save();
					}
				});
   			}
		});
	},
	create_node: function(data){
		var node_data = new Models.NodeModel(data);
		node_data.fetch();
		this.nodeCollection.create(node_data);
	},	

	delete_channel: function (channel){
		var model = this.channelCollection.get(channel.get("id"));
		model.destroy();
		/* TODO: DELETE EVERYTHING UNDER THIS CHANNEL*/
	},

	delete_node: function (topic){
		var model = this.topicCollection.get(topic.get("id"));
		model.destroy();
		if(model.attributes.kind == "topic"){
			/* TODO: DELETE EVERYTHING UNDER THIS TOPIC*/
			this.delete_node_recurse(model);
		}
	},

	delete_node_recurse: function (node){
		node.children.forEach(function(entry){
			this.delete_node_recurse(entry);
		});
		//node.destroy();
	},	
});

module.exports = ChannelEditRouter;