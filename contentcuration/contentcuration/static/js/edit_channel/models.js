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
	parse: function(response) {
	    return _(response).isArray()
	         ? response[0]
	         : response;
	},

	/*Used when copying items to clipboard*/
    duplicate: function(parent_id){
    	var title = this.generate_title(this.get("title"));
		var data = {
			title: title,
			created : this.get("created"),
			modified : this.get("modified"),
			description: this.get("description"),
			deleted: this.get("deleted"),
			sort_order : this.get("sort_order"),
			license_owner : this.get("license_owner"),
			license: this.get("license"),
			kind: this.get("kind"),
			parent: parent_id
		};
		var node_data = new NodeModel(data);
		var self = this;
		node_data.save(data, {async:false,
			success:function(){
				self.copy_children(node_data, self.get("children"));
			}
		});
		return node_data;
	},

	/* Function in case want to append (Copy #) to end of copied content*/
	generate_title:function(title){
    	var list = this.attributes.title.split(" ");
    	if(list[list.length - 1] == "(Copy)"){ 				//model has been copied once before
    		list[list.length - 1] = "(Copy 2)";
    		title = list.join(" ");
    	}else if(list.length > 2 							//model has been copied multiple times
    			&& list[list.length-2] == "(Copy" 
    			&& list[list.length-1].includes(")")){
    		var copy_number = list[list.length-1].replace(")","");
    		list[list.length-1] = ++copy_number + ")";
			title = list.join(" ");
    	}else{
    		title += " (Copy)";
    	}
	},
	copy_children:function(node, original_collection){
		var self = this;
		var parent_id = node.id;
		var copied_collection = new NodeCollection();
		copied_collection.get_all_fetch(original_collection);
		$(copied_collection.models).each(function(){
			console.log("end",this.duplicate(parent_id));
		});
	},
	validate:function (attrs, options){
		console.trace();
		var self = this;

		console.log("Checking if title is blank...");
		//Case: title blank
		if(attrs.title == "")
			return "Name is required.";
		if(attrs.parent){
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
		console.log("Validated!");
	},
});

var NodeCollection = Backbone.Collection.extend({
	model: NodeModel,
	save: function() {
		$(this.models).each(function(){
			this.save();
		});
	},

	url: function(){
       return window.Urls["node-list"]();
    },

   /* TODO: would be better to fetch all values at once */
    get_all_fetch: function(ids){
    	console.log("Calling get_all_fetch on ", ids);
    	var to_fetch = new NodeCollection();
    	for(var i = 0; i < ids.length; i++){
    		var model = this.get({id: ids[i]});
    		if(!model){
    			model = this.add({'id':ids[i]});
    			model.fetch({async:false});
    		}
    		to_fetch.add(model);
    	}
    	console.log("get_all_fetch is", to_fetch);
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
	},
	parse: function(response) {
	    return _(response).isArray()
	         ? response[0]
	         : response;
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
    	$(["clipboard","deleted","draft"]).each(function(){
			var node = channel.get_tree(this.toString()).get_root();
			node.save(data);
		});
    },

    delete_channel:function(){
    	var channel = this;
    	$(["clipboard","deleted","draft"]).each(function() {
		  	var tree = channel.get_tree(this);
	    	tree.destroy();
	    	/*TODO: Delete all child nodes*/
		});
    	this.destroy();
    },
    create_tree:function(tree_name){
    	console.log(tree_name + " tree is being created...");
    	var root_node = new NodeModel();
    	var self = this;
		return root_node.save({title: self.get("name")}, {
			async: false,
			success: function(){
				var tree = new TopicTreeModel();
				return tree.save({
					channel: self.id, 
					root_node: root_node.id,
					name: self.get("name"),
					kind:"topic",
					description: "Root node for " + tree_name + "tree"
				}, {
					async: false,
					success: function(){
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
				$(["draft","clipboard","deleted"]).each(function(){
					/*For future branch: implement progress bar on channel creation
					percent += 25;
					progress_bar.width(percent + "%");*/

					channel_data.create_tree(this.toString());
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