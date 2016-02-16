var Backbone = require("backbone");
var _= require("underscore");

var NodeModel = Backbone.Model.extend({
	defaults: {
		title:"Untitled",
		description:"No description",
		parent: null,
		children:[],
    },
    urlRoot: function() {
		return window.Urls["node-list"]();
	},
	toJSON: function() {
	  var json = Backbone.Model.prototype.toJSON.apply(this, arguments);
	  json.cid = this.cid;
	  return json;
	},

	/*Used when copying items to clipboard*/
    duplicate: function(parent_id){
    	console.log("PERFORMANCE models.js: starting duplicate...");
    	var start = new Date().getTime();
    	var title = this.generate_title(this.get("title"));
    	var data = this.pick('created', 'modified', 'description', 'sort_order', 'license_owner', 'license','kind');
    	data['title'] = title;
    	data['parent_id'] = parent_id;
		var node_data = new NodeModel(data);
		var self = this;
		node_data.save(data, {async:false,
			success:function(){
				self.copy_children(node_data, self.get("children"));
			}
		});
		console.log("PERFORMANCE models.js: duplicate end (time = " + (new Date().getTime() - start) + ")");
		return node_data;
	},

	/* Function in case want to append (Copy #) to end of copied content*/
	generate_title:function(title){
		console.log("PERFORMANCE models.js: starting generate_title...");
		var start = new Date().getTime();
		var new_title = title;
		var matching = /\(Copy\s*([0-9]*)\)/g;
		if (matching.test(new_title)) {
		    new_title = new_title.replace(matching, function(match, p1) {
		        // Already has "(Copy)"  or "(Copy <p1>)" in the title, so return either
		        // "(Copy 2)" or "(Copy <p1+1>)"
		        return "(Copy " + (p1==="" ? 2: Number(p1) + 1) + ")";
		    });
		}else{
			new_title += " (Copy)";
		}
    	console.log("PERFORMANCE models.js: generate_title end (time = " + (new Date().getTime() - start) + ")");
    	return new_title;
	},
	copy_children:function(node, original_collection){
		console.log("PERFORMANCE models.js: starting copy_children...");
		var start = new Date().getTime();
		var self = this;
		var parent_id = node.id;
		var copied_collection = new NodeCollection();
		copied_collection.get_all_fetch(original_collection);
		copied_collection.forEach(function(entry){
			entry.duplicate(parent_id);
		});
		console.log("PERFORMANCE models.js: copy_children end (time = " + (new Date().getTime() - start) + ")");
	},
	validate:function (attrs, options){
		console.log("PERFORMANCE models.js: starting validate on " + attrs.title + "...");
		var start = new Date().getTime();
		var self = this;
		console.log("Checking if title is blank...");
		//Case: title blank
		if(attrs.title == "")
			return "Name is required.";
		if(attrs.parent){
			console.log("Checking if topic is descendant of itself..");
			var parent = new NodeModel({'id': attrs.parent});
			parent.fetch({async:false});
			if(attrs.kind == "topic"){
				console.log("Checking if topic is descendant of itself..");
				//Case: is a child of itself
				if(parent.id == self.id)
					return "Cannot place topic under itself."

				//Case: is a child of its descendants
				var temp = new NodeModel({'id': parent.get("parent")});
				while(temp.get("parent")){
					temp = new NodeModel({'id': parent.get("parent")});
					temp.fetch();
					if(temp.id == self.id)
						return "Cannot place topic under any of its subtopics."
				}
			}

			console.log("Checking if title already exists in topic..");
			//Case: topic with same name exists in children
			if(!this.siblings)
				this.siblings = new NodeCollection();
			if(!this.parent_children || parent.get("children") != this.parent_children){
				this.parent_children = parent.get("children");
				this.siblings = this.siblings.get_all_fetch(this.parent_children);
			}
			for(var i = 0; i < this.siblings.models.length; i++){
				if(this.siblings.models[i].get("title") == attrs.title && this.siblings.models[i].id != self.id){
					return "Name already exists under this topic. Rename and try again.";
				}
			}
		}
		console.log("PERFORMANCE models.js: validate end (time = " + (new Date().getTime() - start) + ")");
	},
});

var NodeCollection = Backbone.Collection.extend({
	model: NodeModel,
	save: function() {
        Backbone.sync("update", this, {url: this.model.prototype.urlRoot()});
	},
	url: function(){
       return window.Urls["node-list"]();
    },

   /* TODO: would be better to fetch all values at once */
    get_all_fetch: function(ids){
    	console.log("PERFORMANCE models.js: starting get_all_fetch...", ids);
		var start = new Date().getTime();
    	var to_fetch = new NodeCollection();
    	for(var i = 0; i < ids.length; i++){
    		if(ids[i]){
    			var model = this.get({id: ids[i]});
	    		if(!model){
	    			model = this.add({'id':ids[i]});
	    			model.fetch({async:false});
	    		}
	    		to_fetch.add(model);
    		}
    	}
    	console.log("PERFORMANCE models.js: get_all_fetch end (time = " + (new Date().getTime() - start) + ")");
    	return to_fetch;
    },
    sort_by_order:function(){
    	this.comparator = function(node){
    		return node.get("sort_order");
    	};
    	this.sort();
    },
});

var TopicTreeModel = Backbone.Model.extend({
	get_root: function(){
		var root = new NodeModel({id: this.get("root_node")});
		root.fetch({async:false});
		return root;
	},
	urlRoot: function() {
		return window.Urls["topictree-list"]();
	},
	defaults: {
		name: "Untitled Tree",
		is_published: false
	}
});

var TopicTreeModelCollection = Backbone.Collection.extend({
	model: TopicTreeModel,
	save: function() {
        Backbone.sync("update", this, {url: this.model.prototype.urlRoot()});
	},
	url: function() {
		return window.Urls["topictree-list"]();
	}
});

var ChannelModel = Backbone.Model.extend({
	urlRoot: function() {
		return window.Urls["channel-list"]();
	},
	defaults: {
		name: " ",
		editors: [],
		author: "Anonymous",
		license_owner: "No license found",
		description:" "
    },
    get_tree:function(tree_name){
    	var tree = new TopicTreeModel({id : this.get(tree_name)});
    	tree.fetch({async:false});
    	return tree;
    },

    update_root:function(data){
    	var channel = this;
    	["clipboard","deleted","draft"].forEach(function(entry){
			var node = channel.get_tree(entry.toString()).get_root();
			node.save(data);
		});
    },

    delete_channel:function(){
    	var channel = this;
    	["clipboard","deleted","draft"].forEach(function(entry) {
		  	var tree = channel.get_tree(entry);
	    	tree.destroy();
	    	/*TODO: Delete all child nodes*/
		});
    	this.destroy();
    },
    create_tree:function(tree_name){
    	console.log("PERFORMANCE models.js: starting create_tree " + tree_name + "...");
    	var start = new Date().getTime();

    	var root_node = new NodeModel();
    	var self = this;
		return root_node.save({title: self.get("name")}, {
			async:false,
			validate: false,
			success: function(){
				var tree = new TopicTreeModel();
				return tree.save({
					channel: self.id, 
					root_node: root_node.id,
					name: self.get("name"),
					kind:"topic",
					description: "Root node for " + tree_name + "tree"
				}, {
					async:false,
					validate:false,
					success: function(){
						console.log("PERFORMANCE models.js: create_tree " + tree_name + " end (time = " + ((new Date().getTime() - start)/1000) + "s)");
						return self.save(tree_name, tree.id);
					}
				});
			}
		});
    }
});

var ChannelCollection = Backbone.Collection.extend({
	model: ChannelModel,

	save: function() {
        Backbone.sync("update", this, {url: this.model.prototype.urlRoot()});
	},
	url: function() {
		return window.Urls["channel-list"]();
	},
	create_channel:function(data, progress_bar){
		var channel_data = new ChannelModel(data);
		
		channel_data.fetch();
		if(channel_data.get("description").trim() == "")
			channel_data.set({description: "No description available."});
		var container = this;
		var percent = 0;
		
		return this.create(channel_data, {
			async: false,
			success:function(){
				["draft","clipboard","deleted"].forEach(function(entry){
					/*For future branch: implement progress bar on channel creation
					percent += 25;
					progress_bar.width(percent + "%");*/

					channel_data.create_tree(entry.toString());
				});
   			}
		});
    },
   
});

module.exports = {
	NodeModel: NodeModel,
	NodeCollection: NodeCollection,
	TopicTreeModel:TopicTreeModel,
	TopicTreeModelCollection: TopicTreeModelCollection,
	ChannelModel: ChannelModel,
	ChannelCollection: ChannelCollection
}