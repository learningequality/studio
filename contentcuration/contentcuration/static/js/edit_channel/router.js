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
							"trash_page", "save", "delete","generate_folder", "generate_file", "create");
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
		var EditViews = require("edit_channel/views");
		new EditViews.EditView({
			el: $("#channel-container"),
			model : this.model,
			edit: true,
			channel: current_tree.attributes
		});
		this.navigate(current_tree.attributes.channel.attributes.name + "/edit", {trigger: true});
    },
	
	edit_page : function(){
		var EditViews = require("edit_channel/tree_edit/views");
		window.edit_page_view = new EditViews.TreeEditView({
			el: $("#main-content-area"),
			model: this.model,
			edit: true,
			channel: current_tree.attributes
		});
	},
	preview_page : function(channel){
		var EditViews = require("edit_channel/tree_edit/views");
		window.edit_page_view = new EditViews.TreeEditView({
			el: $("#main-content-area"),
			model: this.model,
			edit: false,
			channel: current_tree.attributes
		});
		
	},
	
	trash_page : function(channel){
		var TrashViews = require("edit_channel/trash/views");
		new TrashViews.TrashView({
			el: $("#main-content-area"),
			model: this.model,
			channel: current_tree.attributes
		});
		
	},
	set_channel: function (channel){		
		current_tree = this.model.topictrees;
		current_tree.fetch({channel : channel.id});
		if(current_tree.models.length == 0){
			current_tree = new Models.TopicTreeModel(channel);
		}else{
			current_tree = current_tree.models[0];
		}
		current_tree.set({channel : channel});
		window.channel_router.navigate(current_tree.attributes.channel.attributes.name, {trigger: true});
	},
	
	generate_folder: function(folder){
		return new Models.TopicNodeModel(folder);
	}, 
	generate_file: function(file){
		return  new Models.ContentNodeModel(file);
	}, 
	save: function (channel, curr_channel){
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
	
	delete: function (channel){
		var model = this.channelCollection.get(channel.get("id"));
		
		console.log("DELETING model", model);
		console.log("collection", this.channelCollection);
		model.destroy();
		console.log("collection", this.channelCollection);
		return false;
	}
});

module.exports = ChannelEditRouter;