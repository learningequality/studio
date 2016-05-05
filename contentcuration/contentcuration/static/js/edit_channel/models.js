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
		var self = this;
		this.models.forEach(function(entry){
			if(entry.hasChanged()){
				entry.save();
			}
		});
        Backbone.sync("update", this, {url: this.model.prototype.urlRoot()});
	}
});

/**** CHANNEL AND CONTENT MODELS ****/
var NodeModel = BaseModel.extend({
	root_list:"node-list",
	defaults: {
		title:"Untitled",
		parent: null,
		children:[],
		kind: "topic",
		license:1,
		total_file_size:0
    },

	/*Used when copying items to clipboard*/
    duplicate: function(target_parent){
        var node_id = this.get("id");
        var sort_order = target_parent.get("children").length;
        var parent_id = target_parent.get("id");
        var data = {node_id: node_id,
                    sort_order: sort_order,
                    target_parent: parent_id};
        var new_node_data;
        $.post({
            url: window.Urls.duplicate_node(),
            data: data,
            async: false,
            success: function(data) {
                var data = JSON.parse(data);
                new_node_data = new NodeModel(data);
            }
        });
        new_node_data.fetch({cache: false});
        return new_node_data;
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
			this.save(this.attributes, {async:false, validate:false}); //Save any other values
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
		var copied_collection = new NodeCollection();
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
			var parent = new NodeModel({'id': attrs.parent});
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

	get_mimetype:function(type){
		return window.mimetypes.findWhere({machine_name: type});
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

var NodeCollection = BaseCollection.extend({
	model: NodeModel,
	list_name:"node-list",

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

var ChannelModel = BaseModel.extend({
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
		var root = new NodeModel({id: this.get("root_node")});
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
	root_list:"format-list"
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
	NodeModel: NodeModel,
	NodeCollection: NodeCollection,
	TopicTreeModel:TopicTreeModel,
	TopicTreeModelCollection: TopicTreeModelCollection,
	ChannelModel: ChannelModel,
	ChannelCollection: ChannelCollection,
	MimeTypeCollection:MimeTypeCollection,
	LicenseCollection:LicenseCollection
}
