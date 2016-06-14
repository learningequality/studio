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
		var node_id = this.get("id");
		var sort_order =(target_parent) ? target_parent.get("children").length : 1;
        var parent_id = (target_parent) ? target_parent.get("id") : null;

        var data = {"node_id": node_id,
                    "sort_order": sort_order,
                    "target_parent": parent_id};
        var copied_id;
        $.ajax({
        	method:"POST",
            url: window.Urls.duplicate_node(),
            data:  JSON.stringify(data),
            async: false,
            success: function(data) {
                copied_id = JSON.parse(data).node_id;
            },
            error:function(e){
            	console.log("ERROR: " + e.responseText);
            }
        });
        return copied_id;
	},

	move:function(target_parent, allow_duplicate, sort_order){
    	var start = new Date().getTime();
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
			this.save(this.attributes, {async:false, validate:false}); //Save any other values
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
    	return new_title.slice(0, new_title.length);
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
		}
	},
	create_file:function(){
		this.get("files").forEach(function(file){
			if(file.attributes){
				var data = file.pick("file_size", "contentnode", "preset");
				file.save(data,{async:false});
			}
		});
	},
	get_formats:function(){
		var formats = new FileFormatCollection();
		formats.fetch({async:false});
		return formats.where({contentnode : this.id});
	},
	get_fileformat:function(type){
		return window.fileformats.findWhere({extension: type});
	}
});

var ContentNodeCollection = BaseCollection.extend({
	model: ContentNodeModel,
	list_name:"contentnode-list",

	save: function(callback) {
		var self = this;
        Backbone.sync("update", this, {
        	url: this.model.prototype.urlRoot(),
        	async:false,
        	success: function(data){
        		var fetch_list = [];
        		data.forEach(function(entry){
        			fetch_list.push(entry.id);
				});
				self.get_all_fetch(fetch_list).forEach(function(node){
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
    	var self = this;
    	ids.forEach(function(id){
    		if(id){
    			var model = self.get({'id': id});
	    		if(!model){
	    			model = self.add({'id':id});
	    			model.fetch({async:false});
	    		}
	    		to_fetch.add(model);
    		}
    	});
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
    	var copied_list = [];
    	this.forEach(function(node){
    		copied_list.push(node.duplicate(target_parent, options));
    	});
    	var copiedCollection = new ContentNodeCollection();
    	copiedCollection.get_all_fetch(copied_list);
    	return copiedCollection;
    },
    move:function(target_parent, sort_order, callback){
    	this.forEach(function(model){
			model.set({
				parent: target_parent.id,
				sort_order:++sort_order
			});
    	});
    	this.save(function(){
			callback();
		});
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
	list_name:"tag-list"
});

/**** MODELS SPECIFIC TO FILE NODES ****/
var FileModel = BaseModel.extend({
	root_list:"file-list",
	duplicate: function(contentnode){
		var new_file = this.clone();
		new_file.set({
			contentnode : contentnode
		});

		new_file.save(new_file.attributes, {async:false});
		return new_file;
	}
});

var FileCollection = BaseCollection.extend({
	model: FileModel,
	list_name:"file-list",
	get_or_fetch: function(data){
		var newCollection = new FileCollection();
		newCollection.fetch({
			traditional:true,
			data: data
		});
		var file = newCollection.findWhere(data);
    	return file;
    }
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
