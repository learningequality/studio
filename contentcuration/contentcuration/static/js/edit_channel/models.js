var Backbone = require("backbone");
var _= require("underscore");

var NodeModel = Backbone.Model.extend({
	defaults: {
		title:"Untitled",
		parent: null,
		children:[],
		kind: "topic",
		license:2,
		total_file_size:0
    },
    urlRoot: function() {
    	console.log("GETTING ROOT", window.Urls["node-list"]());
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

	move:function(parent_id, index){
		console.log("add_nodes move called by", this);
		console.log("PERFORMANCE models.js: starting move...");
    	var start = new Date().getTime();
    	var old_parent = this.get("parent");
    	var title = this.get("title");
		this.set({parent: parent_id,sort_order:index}, {validate:true});

		while(this.validationError !== null){
			title = this.generate_title(title);
			console.log("add_node title is now", title);
			this.set({
				title: title, 
				parent: parent_id,
				sort_order:index
			}, {validate:true});
			console.log("add_node validation error!", this.get("title"));
		}
		if(old_parent){
			this.save({title: title, parent: old_parent}, {async:false, validate:false}); //Save any other values
		}else{
			this.save({title: title}, {async:false, validate:false}); //Save any other values
		}
		
		this.save({parent: parent_id, sort_order:index}, {async:false, validate:false}); //Save any other values
		console.log("PERFORMANCE models.js: move end (time = " + (new Date().getTime() - start) + ")");
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
	create_file:function(){
		if(this.attributes.file_data){
			var file_data = this.attributes.file_data;
			var format = new FormatModel();
			format.save({
				available : false,
				format_size: file_data.data.size,
				quality: "normal",
				contentmetadata : this.id,
				mimetype : this.get_mimetype(file_data.data.type).id
			},{
				success:function(){
					var files = new FileCollection();
					files.fetch({async:false});

					var file = files.findWhere({
						checksum: file_data.filename.split(".")[0],
						extension: "." + file_data.filename.split(".")[1]
					});
					file.save({
						format: format.id
					});
				}
			});
		}
	},
	get_formats:function(){
		var formats = new FormatCollection();
		formats.fetch({async:false});
		return formats.where({contentmetadata : this.id});
	},
	get_mimetype:function(type){
		return window.mimetypes.findWhere({machine_name: type});
	},
	get_files: function(){
		var formats = this.get_formats();
		var to_return = new FileCollection();
		console.log("TESTING FORMAT RETRIEVAL...", formats);
		formats.forEach(function(entry){
			to_return.add(entry.get_files());
		});
		return to_return;
	}
});

var FileModel = Backbone.Model.extend({
    urlRoot: function() {
		return window.Urls["file-list"]();
	}
});
var FileCollection = Backbone.Collection.extend({
	model: FileModel,
	save: function() {
        Backbone.sync("update", this, {url: this.model.prototype.urlRoot()});
	},
	url: function(){
       return window.Urls["file-list"]();
    }
});

var FormatModel = Backbone.Model.extend({
    urlRoot: function() {
		return window.Urls["format-list"]();
	},
	get_files : function(){
		var files = new FileCollection();
		files.fetch({async:false});
		//return files.where({format: this.id});
		return files.where({id:74});
	}
});
var FormatCollection = Backbone.Collection.extend({
	model: FormatModel,
	save: function() {
        Backbone.sync("update", this, {url: this.model.prototype.urlRoot()});
	},
	url: function(){
       return window.Urls["format-list"]();
    }
});

var MimeTypeModel = Backbone.Model.extend({
	defaults: {
		readable_name:"invalid",
		machine_name: "invalid"
    },
    urlRoot: function() {
		return window.Urls["mimetype-list"]();
	}
});

var MimeTypeCollection = Backbone.Collection.extend({
	model: MimeTypeModel,
	save: function() {
        Backbone.sync("update", this, {url: this.model.prototype.urlRoot()});
	},
	url: function(){
       return window.Urls["mimetype-list"]();
    },
    create_mimetypes:function(){
    	var self = this;
    	[{readable_name: ".avi", machine_name : "video/avi"},
    	 {readable_name: ".bmp", machine_name : "image/bmp"},
    	 {readable_name: ".gif", machine_name : "image/gif"},
    	 {readable_name: ".html", machine_name : "text/html"},
    	 {readable_name: ".ico", machine_name : "image/x-icon"},
    	 {readable_name: ".jpeg", machine_name : "image/jpeg"},
    	 {readable_name: ".jpg", machine_name : "image/jpeg"},
    	 {readable_name: ".mov", machine_name : "video/quicktime"},
    	 {readable_name: ".mp3", machine_name : "audio/mpeg3"},
    	 {readable_name: ".mp4", machine_name : "video/mp4"},
    	 {readable_name: ".pdf", machine_name : "application/pdf"},
    	 {readable_name: ".png", machine_name : "image/png"},
    	 {readable_name: ".text", machine_name : "text/plain"},
    	 {readable_name: ".txt", machine_name : "text/plain"},
    	 {readable_name: ".wav", machine_name : "audio/wav"}].forEach(function(entry){
    	 	if(self.where(entry).length == 0){
				self.create(entry, {async:false});
    	 	}
    	});
    }
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
    }
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
		/*var url = window.Urls["channel-list"]();
		url.substring(0, url.length -1);*/
		console.log("channel url is", window.Urls["channel-list"]());
		return window.Urls["channel-list"]();
	},
	defaults: {
		name: " ",
		editors: [2],
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
		return root_node.save({title: self.get("name"), description: "Root node for " + tree_name + " tree"}, {
			async:false,
			validate: false,
			success: function(){
				var tree = new TopicTreeModel();
				return tree.save({
					channel: self.id, 
					root_node: root_node.id,
					name: self.get("name")
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
	ChannelCollection: ChannelCollection,
	MimeTypeCollection:MimeTypeCollection
}