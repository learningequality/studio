var Backbone = require("backbone");
var _= require("underscore");

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
	save: function(callback) {
		// var self = this;
		// this.models.forEach(function(entry){
		// 	if(entry.hasChanged()){
		// 		entry.save({async:false});
		// 	}
		// });
        Backbone.sync("update", this, {url: this.model.prototype.urlRoot()});
	}
});

/**** CHANNEL AND CONTENT MODELS ****/
var ContentNodeModel = BaseModel.extend({
	root_list:"contentnode-list",
	defaults: {
		title:"Untitled",
		parent: null,
		children:[],
		kind: "topic",
		license:1,
		total_file_size:0,
		tags:[]
    },

	/*Used when copying items to clipboard*/
    duplicate: function(target_parent, options){
    	var start = new Date().getTime();
    	var data = this.pick('title', 'created', 'modified', 'description', 'sort_order', 'license_owner', 'license','kind');
		var node_data = new ContentNodeModel();
		var nodeChildrenCollection = new ContentNodeCollection();
		var self = this;
		node_data.set(data);
		if(target_parent){
			node_data.move(target_parent, true, target_parent.get("children").length);
		}else{
			node_data.save(data, options);
		}
		self.copy_children(node_data, self.get("children"));

		//var node_data = new NodeModel(window.Urls.copy_node());
		return node_data;
	},

	move:function(target_parent, allow_duplicate, sort_order){
		console.log("CALLED MOVE");
    	var start = new Date().getTime();
    	//var old_parent = new NodeModel({id: this.get("parent")});
    	//old_parent.fetch({async:false});
    	var title = this.get("title");
		this.set({parent: target_parent.id,sort_order:sort_order}, {validate:true});

		if(allow_duplicate){
			while(this.validationError !== null){
				title = this.generate_title(title);
				this.set({
	                title: title,
					parent: target_parent.id,
					sort_order:sort_order
				}, {validate:true});
			}
			this.save(this.attributes, {async:false, validate:false, patch:true}); //Save any other values
			/*target_parent.get("children").push(this.id);

			var new_children = old_parent.get("children");
			old_parent.get("children").splice(old_parent.get("children").indexOf(this.id), 1);*/
		}else{
			return this.validationError;
		}
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
		var copied_collection = new ContentNodeCollection();
		copied_collection = copied_collection.get_all_fetch(original_collection);
		copied_collection.forEach(function(entry){
			entry.duplicate(node);
		});
		console.log("PERFORMANCE models.js: copy_children end (time = " + (new Date().getTime() - start) + ")");
	},
	validate:function (attrs, options){
		if(attrs.title == "")
			return "Name is required.";

		if(attrs.parent){
			var parent = new ContentNodeModel({'id': attrs.parent});
			parent.fetch({async:false});

			if(parent.get("ancestors").indexOf(attrs.id) >= 0){
				return "Cannot place topic under itself."
			}

			/*If want to make items unique under same parent
			var error = null;

			parent.get("child_names").forEach(function(entry){
				if(entry.title === attrs.title && entry.id != attrs.id){
					error = "'" + attrs.title + "' already exists under this topic. Rename and try again.";
				}
			})

			return error;
			*/
		}
	},
	create_file:function(){
		console.log("CALLED CREATE FILE", this);
		this.get("files").forEach(function(file){
			console.log("files are", file.get("contentmetadata"));
			var data = file.pick("file_size", "contentmetadata", "preset");
			file.save(data,{patch:true, async:false});
		});
	},
	get_formats:function(){
		var formats = new FileFormatCollection();
		formats.fetch({async:false});
		return formats.where({contentmetadata : this.id});
	},
	get_fileformat:function(type){
		return window.fileformats.findWhere({extension: type});
	},
	get_files: function(){
		var formats = this.get("formats");
		var to_return = new FileCollection();
		if(formats){
			formats.forEach(function(entry){
				entry.files.forEach(function(file){
					to_return.add(new FileModel(file));
				});
			});
		}
		return to_return;
	}
});

var ContentNodeCollection = BaseCollection.extend({
	model: ContentNodeModel,
	list_name:"contentnode-list",

	save: function(callback) {
		var self = this;
		console.log("FILE BEFORE COLLECTION", this);
        Backbone.sync("update", this, {
        	url: this.model.prototype.urlRoot(),
        	async:false,
        	success: function(data){
        		data.forEach(function(entry){
        			var node = self.get_all_fetch([entry.id]).models[0];
        			node.create_file();
				});
        		callback();
        	}

        });
	},

   /* TODO: would be better to fetch all values at once */
    get_all_fetch: function(ids){
    	console.log("PERFORMANCE models.js: starting get_all_fetch...", ids);
		var start = new Date().getTime();
    	var to_fetch = new ContentNodeCollection();
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
    duplicate:function(target_parent, options){
    	var copiedCollection = new NodeCollection();
    	this.forEach(function(node){
    		copiedCollection.add(node.duplicate(target_parent, options));
    	});
    	return copiedCollection;
    }
});

var ChannelModel = BaseModel.extend({
    idAttribute: "channel_id",
	root_list : "channel-list",
	defaults: {
		name: " ",
		editors: [1],
		author: "Anonymous",
		license_owner: "No license found",
		description:" "
    },

    get_tree:function(tree_name){
    	var tree = new TopicTreeModel({id : this.get(tree_name)});
    	tree.fetch({async:false});
    	return tree;
    }
});

var ChannelCollection = BaseCollection.extend({
	model: ChannelModel,
	list_name:"channel-list",
	create_channel:function(data){
		this.create(data, {async:false});
    }
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

var TagModel = BaseModel.extend({
	root_list : "tag-list",
	defaults: {
		tag_name: "Untagged"
    }
   /* get_or_create:function(){
		var collection = new TagCollection();
		collection.get_or_create(this.get("tag_name"), this.get("tag_type"));
	}*/
});

var TagCollection = BaseCollection.extend({
	model: TagModel,
	list_name:"tag-list",
	/*get_or_create:function(name, type){
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
	}*/
});

/**** MODELS SPECIFIC TO FILE NODES ****/
var FileModel = BaseModel.extend({
	root_list:"file-list"
});

var FileCollection = BaseCollection.extend({
	model: FileModel,
	list_name:"file-list"
});

var FormatPresetModel = BaseModel.extend({
	root_list:"formatpreset-list",
	attached_format: null,

	get_files : function(){
		var files = new FileCollection();
		files.fetch({async:false});
		return files.where({format: this.id});
	}
});

var FormatPresetCollection = BaseCollection.extend({
	model: FormatPresetModel,
	list_name:"formatpreset-list",
	sort_by_order:function(){
    	this.comparator = function(preset){
    		return preset.get("order");
    	};
    	this.sort();
    }
});


/**** PRESETS AUTOMATICALLY GENERATED UPON FIRST USE ****/
var FileFormatModel = Backbone.Model.extend({
	root_list: "fileformat-list",
	defaults: {
		extension:"invalid"
    }
});

var FileFormatCollection = BaseCollection.extend({
	model: FileFormatModel,
	list_name:"fileformat-list",
});

var LicenseModel = BaseModel.extend({
	root_list:"license-list",
	defaults: {
		license_name:"Unlicensed",
		exists: false
    }
});

var LicenseCollection = BaseCollection.extend({
	model: LicenseModel,
	list_name:"license-list",

    get_default:function(){
    	return this.findWhere({license_name:"CC-BY"});
    }
});

var ContentKindModel = BaseModel.extend({
	root_list:"contentkind-list",
	defaults: {
		kind:"topic"
    },
    get_presets:function(){
    	return window.formatpresets.where({kind: this.get("kind")})
    }
});

var ContentKindCollection = BaseCollection.extend({
	model: ContentKindModel,
	list_name:"contentkind-list",

    get_default:function(){
    	return this.findWhere({kind:"topic"});
    }
});



module.exports = {
	ContentNodeModel: ContentNodeModel,
	ContentNodeCollection: ContentNodeCollection,
	TopicTreeModel:TopicTreeModel,
	TopicTreeModelCollection: TopicTreeModelCollection,
	ChannelModel: ChannelModel,
	ChannelCollection: ChannelCollection,
	TagModel: TagModel,
	FileFormatCollection:FileFormatCollection,
	LicenseCollection:LicenseCollection,
	FileCollection: FileCollection,
	FileModel: FileModel,
	FormatPresetModel: FormatPresetModel,
	FormatPresetCollection: FormatPresetCollection,
	ContentKindModel: ContentKindModel,
	ContentKindCollection : ContentKindCollection
}
