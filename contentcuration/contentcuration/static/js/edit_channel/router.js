var _ = require("underscore");
var Backbone = require("backbone");
var Models = require("./models");
var Views = require("./views");
var ChannelManageView = require("edit_channel/new_channel/views");

var current_tree;
//var saveDispatcher = _.clone(Backbone.Events);

ChannelEditRouter  = Backbone.Router.extend({
    initialize: function(options) {
        _.bindAll(this, "navigate_channel_home", "navigate_channel", "edit_page", "preview_page", 
							"trash_page", "save_channel", "delete_channel","generate_folder", "generate_file", "create",
							"save_folder", "save_file",'delete_topic');
		this.user = options.user;
		this.model = options.model;
		
		//this.listenTo(saveDispatcher, "save", this.save);
    },
	
    routes: {
		"": "navigate_channel_home",
		"edit" : "navigate_channel",
		":channel":    "navigate_channel",
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
		
	navigate_channel : function() {
		this.topicCollection = new Models.TopicNodeCollection();
		this.topicCollection.fetch();
		this.contentCollection = new Models.ContentNodeCollection();
		this.contentCollection.fetch();
		var EditViews = require("edit_channel/views");
		new EditViews.EditView({
			el: $("#channel-container"),
			edit: true,
			channel: current_tree.attributes
		});
		this.navigate(current_tree.attributes.channel.attributes.name + "/edit", {trigger: true});
    },
	
	edit_page : function(){
		var EditViews = require("edit_channel/tree_edit/views");
		window.edit_page_view = new EditViews.TreeEditView({
			el: $("#main-content-area"),
			edit: true,
			channel: current_tree.attributes
		});
	},
	preview_page : function(channel){
		var EditViews = require("edit_channel/tree_edit/views");
		window.edit_page_view = new EditViews.TreeEditView({
			el: $("#main-content-area"),
			edit: false,
			channel: current_tree.attributes
		});
		
	},
	
	trash_page : function(channel){
		var TrashViews = require("edit_channel/trash/views");
		new TrashViews.TrashView({
			el: $("#main-content-area"),
			channel: current_tree.attributes
		});
		
	},
	set_channel: function (channel){		
		current_tree = new Models.TopicTreeModelCollection(window.topic_trees);
		current_tree.fetch({data: $.param({channel : channel.id})});
		if(current_tree.models.length == 0){
			current_tree = new Models.TopicTreeModel(channel);
		}else{
			current_tree = current_tree.models[0];
		}
		current_tree.set({channel : channel});
		window.channel_router.navigate(current_tree.attributes.channel.attributes.name, {trigger: true});
	},
	
	generate_folder: function(folder){
		var folder_data = new Models.TopicNodeModel(folder);
		this.topicCollection.create(folder_data);
		console.log("collection", this.topicCollection);
		return folder_data;
	}, 
	generate_file: function(file){
		return  new Models.ContentNodeModel(file);
	}, 
	save_channel: function (channel, curr_channel){
		if(!curr_channel){
			var channel_data = new Models.ChannelModel(channel);
			this.channelCollection.create(channel_data);
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
		return false;
	},
	delete_topic: function (topic){
		var model = this.topicCollection.get(topic.get("id"));
		model.destroy();
		return false;
	}
});

module.exports = ChannelEditRouter;