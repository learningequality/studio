var Backbone = require("backbone");
var _= require("underscore");
var presets = require("edit_channel/presets.json");

var mimetype_list = presets["mimetypes"];

var license_list = presets["licenses"];

/**** BASE MODELS ****/
var BaseModel = Backbone.Model.extend({
	root_list:null,
	urlRoot: function() {
		return window.Urls[this.root_list]();
	},
	toJSON: function() {
	  var json = Backbone.Model.prototype.toJSON.apply(this, arguments);
	  json.cid = this.cid;
	  return json;
	}
});

var BaseCollection = Backbone.Collection.extend({
	list_name:null,
	url: function() {
		return window.Urls[this.list_name]();
	},
	save: function() {
        Backbone.sync("update", this, {url: this.model.prototype.urlRoot()});
	}
});

/**** CHANNEL AND CONTENT MODELS ****/
var ContentNodeModel = BaseModel.extend({
	root_list:"node-list",
	defaults: {
		title:"Untitled",
		parent: null,
		children:[],
		kind: "topic",
		license:1,
		total_file_size:0
    },

	getChildCount:function(includeParent, collection){
		var count = (includeParent) ? 1:0;
		var children = collection.get_all_fetch(this.get("children"));
		children.forEach(function(entry){
			count += entry.getChildCount(true, collection);
		});
		return count;
	},
	getChildCount:function(includeParent, collection){
		if(!collection){
			collection = new ContentNodeCollection();
		}
		var count = (includeParent) ? 1:0;
		var children = collection.get_all_fetch(this.get("children"));
		children.forEach(function(entry){
			count += entry.getChildCount(true, collection);
		});
		return count;
	},

	/*Used when copying items to clipboard*/
    duplicate: function(parent_id, index){
    	console.log("add_nodes duplicate called by", this);
    	console.log("PERFORMANCE models.js: starting duplicate...");
    	var start = new Date().getTime();
    	var data = this.pick('title', 'created', 'modified', 'description', 'sort_order', 'license_owner', 'license','kind');
		var node_data = new ContentNodeModel();
		var nodeChildrenCollection = new ContentNodeCollection();
		var self = this;
		node_data.set(data);
		node_data.move(parent_id, index);
		self.copy_children(node_data, self.get("children"));
		console.log("add_node sending back data", node_data);
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
			var old_parent_node = new ContentNodeModel({id:old_parent});
			old_parent_node.fetch({async:false});
			old_parent_node.save({total_file_size: old_parent_node.get_size()});
		}else{
			this.save({title: title}, {async:false, validate:false}); //Save any other values
		}

		this.save({parent: parent_id, sort_order:index}, {async:false, validate:false}); //Save any other values
		var new_parent = new ContentNodeModel({id:parent_id});
		new_parent.fetch({async:false});
		new_parent.save({total_file_size: new_parent.get_size()});
		console.log("PERFORMANCE models.js: move end (time = " + (new Date().getTime() - start) + ")");
	},
	get_size:function(){
		var collection = new ContentNodeCollection();
		var size = 0;
		var children = collection.get_all_fetch(this.get("children"));
		children.forEach(function(entry){
			size += entry.get("total_file_size");
		});
		return size;
	},
	/* Function in case want to append (Copy #) to end of copied content*/
	generate_title:function(title){
		var start = new Date().getTime();
		var new_title = title;
		var matching = /\(Copy\s*([0-9]*)\)/g;
		if (matching.test(new_title)) {
		    new_title = new_title.replace(matching, function(match, p1) {
		        // Already has "(Copy)"  or "(Copy <p1>)" in the title, so return either
		        // "(Copy 2)" or "(Copy <p1+1>)"
		        return "(Copy " + ((p1==="") ? 2: Number(p1) + 1) + ")";
		    });
		}else{
			new_title += " (Copy)";
		}
    	console.log("new title is " + new_title);
    	return new_title.slice(0, new_title.length);
	},
	copy_children:function(node, original_collection){
		console.log("PERFORMANCE models.js: starting copy_children...");
		var start = new Date().getTime();
		var self = this;
		var parent_id = node.id;
		var copied_collection = new ContentNodeCollection();
		copied_collection = copied_collection.get_all_fetch(original_collection);
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
			var parent = new ContentNodeModel({'id': attrs.parent});
			parent.fetch({async:false});
			if(attrs.kind == "topic"){
				console.log("Checking if topic is descendant of itself..");
				//Case: is a child of itself
				if(parent.id == self.id)
					return "Cannot place topic under itself."

				//Case: is a child of its descendants
				var temp = new ContentNodeModel({'id': parent.get("parent")});
				while(temp.get("parent")){
					temp = new ContentNodeModel({'id': parent.get("parent")});
					temp.fetch();
					if(temp.id == self.id)
						return "Cannot place topic under any of its subtopics."
				}
			}

			console.log("Checking if title already exists in topic..");
			//Case: topic with same name exists in children
			if(!this.siblings)
				this.siblings = new ContentNodeCollection();
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
			var self = this;
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
					self.save({total_file_size: file.get("file_size")});
					console.log("SAVING FILE:", file);
					file.save({
						  format: format.id,
          },
          {
              patch: true,
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

var ContentNodeCollection = BaseCollection.extend({
	model: ContentNodeModel,
	list_name:"node-list",

   /* TODO: would be better to fetch all values at once */
    get_all_fetch: function(ids){
    	console.log("PERFORMANCE models.js: starting get_all_fetch...", ids);
		var start = new Date().getTime();
    	var to_fetch = new ContentNodeCollection();
    	for(var i = 0; i < ids.length; i++){
    		if(ids[i]){
    			var model = this.get({id: ids[i]});
	    		//if(!model){
	    			model = this.add({'id':ids[i]});
	    			model.fetch({async:false});
	    		//}
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

var ChannelModel = BaseModel.extend({
	root_list : "channel-list",
	defaults: {
		name: " ",
		editors: [1],
		author: "Anonymous",
		license_owner: "No license found",
		description:" "
    },
    /*
    get_data:function(){
    		$.get("/api-test", function(result){
    			console.log("Got data: ", JSON.parse(result)['filename']);
    		});
    },*/
    get_tree:function(tree_name){
    	var tree = new TopicTreeModel({id : this.get(tree_name)});
    	console.log(tree_name + " tree is", tree);
    	/*if(!tree.id){
    		var channel = new ChannelModel({id: this.get("channel")});
    		channel.fetch({async:false});
    		console.log("got channel", channel);
    		channel.create_tree(tree_name);
    	}*/
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

    	var root_node = new ContentNodeModel();
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
						self.save(tree_name , tree.id, {async:false});
					}
				});
			}
		});
    }
});

var ChannelCollection = BaseCollection.extend({
	model: ChannelModel,
	list_name:"channel-list",
	create_channel:function(data){
		var channel_data = new ChannelModel(data);

		channel_data.fetch();
		if(channel_data.get("description").trim() == "")
			channel_data.set({description: "No description available."});
		return this.create(channel_data, {
			async: false,
			success:function(){
				["draft","clipboard","deleted"].forEach(function(entry){
					channel_data.create_tree(entry.toString());
					console.log("creating " + entry.toString());
				});
   			}
		});
    },
});

var TopicTreeModel = BaseModel.extend({
	root_list:"topictree-list",
	defaults: {
		name: "Untitled Tree",
		is_published: false
	},
	get_root: function(){
		var root = new ContentNodeModel({id: this.get("root_node")});
		root.fetch({async:false});
		return root;
	}
});

var TopicTreeModelCollection = BaseCollection.extend({
	model: TopicTreeModel,
	list_name:"topictree-list"
});


/**** MODELS SPECIFIC TO FILE NODES ****/
var FileModel = BaseModel.extend({
	root_list:"file-list"
});

var FileCollection = BaseCollection.extend({
	model: FileModel,
	list_name:"file-list"
});

var FormatModel = BaseModel.extend({
	root_list:"format-list",
	/*HARDCODED FOR NOW, NEED TO ASSIGN FORMATS*/
	get_files : function(){
		var files = new FileCollection();
		files.fetch({async:false});
		return files.where({format: this.id});
	}
});

var FormatCollection = BaseCollection.extend({
	model: FormatModel,
	list_name:"format-list"
});


/**** PRESETS AUTOMATICALLY GENERATED UPON FIRST USE ****/
var PresetCollection = BaseCollection.extend({
	model: MimeTypeModel,
	list_to_create:[],
	list_name: null,

    create_presets:function(){
    	var self = this;
    	this.list_to_create.forEach(function(entry){
    	 	if(self.where(entry).length == 0){
				self.create(entry, {async:false});
    	 	}
    	});
    }
});

var MimeTypeModel = Backbone.Model.extend({
	root_list: "mimetype-list",
	defaults: {
		readable_name:"invalid",
		machine_name: "invalid"
    }
});

var MimeTypeCollection = PresetCollection.extend({
	model: MimeTypeModel,
	list_name:"mimetype-list",
	list_to_create:mimetype_list,

    create_mimetypes:function(){
    	this.create_presets();
    }
});

var LicenseModel = BaseModel.extend({
	root_list:"contentlicense-list",
	defaults: {
		license_name:"Unlicensed",
		exists: false
    }
});

var LicenseCollection = PresetCollection.extend({
	model: LicenseModel,
	list_name:"contentlicense-list",
	list_to_create:license_list,

    create_licenses:function(){
    	this.create_presets();
    },
    get_default:function(){
    	return this.findWhere({license_name:"CC-BY"});
    }
});


var TagModel = BaseModel.extend({
	root_list : "tag-list",
	defaults: {
		tag_name: "Untagged"
    },
    get_or_create:function(){
		var collection = new TagCollection();
		collection.get_or_create(this.get("tag_name"), this.get("tag_type"));
	}
});

var TagCollection = BaseCollection.extend({
	model: TagModel,
	list_name:"tag-list",
	get_or_create:function(name, type){
		var to_return = this.get({"tag_name" : name});
		if(!to_return){
			to_return.fetch({async:false});
			if(!to_return){
				to_return = this.create({
					tag_name : name,
					tag_type : type
				}, {async:false});
			}
		}
		return to_return;
	}
});

module.exports = {
	ContentNodeModel: ContentNodeModel,
	ContentNodeCollection: ContentNodeCollection,
	TopicTreeModel:TopicTreeModel,
	TopicTreeModelCollection: TopicTreeModelCollection,
	ChannelModel: ChannelModel,
	ChannelCollection: ChannelCollection,
	MimeTypeCollection:MimeTypeCollection,
	LicenseCollection:LicenseCollection
}
