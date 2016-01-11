var _ = require("underscore");
var Backbone = require("backbone");
var Models = require("./models");
var Views = require("./views");
var ChannelManageView = require("edit_channel/new_channel/views");

var current_tree;
//var saveDispatcher = _.clone(Backbone.Events);

ChannelEditRouter  = Backbone.Router.extend({
    initialize: function(options) {
        _.bindAll(this, "navigate_channel_home", "edit_page", "preview_page", 
							"trash_page", "save_channel", "delete_channel",
							"generate_folder", "generate_file", "generate_temp_file", 
							"create", "save_folder", "save_file",'delete_topic');
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
		window.channel_manager_view = new ChannelManageView.ManageChannelsView ({
			el: $("#channel-container"),
			model: this.model,
			channels: this.channelCollection
		});
    },
	
	/*************************FIX HERE***************************************/
	edit_page : function(){
		console.log("topic tree edit", window.topic_tree);
		var topictree = new Models.TopicTreeModelCollection(window.topic_tree);
		var root = new Models.NodeModel(window.root);
		var EditViews = require("edit_channel/tree_edit/views");
		window.edit_page_view = new EditViews.TreeEditView({
			el: $("#main-content-area"),
			edit: true,
			root: root
		});
	},




	preview_page : function(channel){
		var topictree = new Models.TopicTreeModelCollection(window.topic_tree);
		var EditViews = require("edit_channel/tree_edit/views");
		var root = new Models.NodeModel(window.root);
		window.edit_page_view = new EditViews.TreeEditView({
			el: $("#main-content-area"),
			edit: false,
			channel: topictree,
			root: root
		});
		
	},
	
	trash_page : function(channel){
		var topictree = new Models.TopicTreeModelCollection(window.topic_tree);
		var TrashViews = require("edit_channel/trash/views");
		new TrashViews.TrashView({
			el: $("#main-content-area"),
			channel: topictree
		});
		
	},
	
	/*set_channel: function (channel){		
		current_tree = new Models.TopicTreeModelCollection(window.topic_trees);
		current_tree.fetch({data: $.param({channel : channel.id})});
		console.log(window.localStorage);
		if(current_tree.models.length == 0){
			current_tree = new Models.TopicTreeModel(channel);
		}else{
			current_tree = current_tree.models[0];
		}
		current_tree.set({channel : channel});
		window.current_channel = current_tree;
		window.channel_router.navigate(current_tree.attributes.channel.attributes.name, {trigger: true});
		
	},
	*/
	generate_folder: function(folder){
		var folder_data = new Models.NodeModel(folder);
		//this.topicCollection.create(folder_data);
		//console.log("collection", this.topicCollection);
		return folder_data;
	}, 
	generate_file: function(file){
		var file_data = new Models.NodeModel(file);
		//this.contentCollection.create(file_data);
		//console.log("collection", this.contentCollection);
		return  file_data;
	}, 
	generate_temp_file : function (file){
		var file_data = new Models.NodeModel(file);
		return  file_data;
	},
	save_channel: function (channel, curr_channel){
		if(!curr_channel){
			var channel_data = new Models.ChannelModel(channel);
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
		}
		else{
			curr_channel.set(channel);
			curr_channel.save();
		}
		window.channel_manager_view.render();
	},
	
	create: function(){
		this.channelCollection.create();
	},
	save_folder : function(root, curr_folder){
		console.log("currfolder" , curr_folder);
		console.log("root" , root);
		//curr_folder.insert_at(root, 'first-child', true);
	/*
		curr_folder.save();
		this.topicCollection.save();
		console.log("current folder", curr_folder);
		*/
	},
	save_file : function(){
	},
	
	delete_channel: function (channel){
		var model = this.channelCollection.get(channel.get("id"));
		model.destroy();
		//TODO move deleted nodes to trash
		return false;
	},
	delete_topic: function (topic){
		var model = this.topicCollection.get(topic.get("id"));
		model.destroy();
		//TODO move to trash instead
		return false;
	}
});

module.exports = ChannelEditRouter;