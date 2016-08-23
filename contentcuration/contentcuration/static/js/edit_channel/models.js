var Backbone = require("backbone");
var _= require("underscore");
var mail_helper = require("edit_channel/utils/mail");

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
	},
	get_all_fetch: function(ids, force_fetch = false){
    	var self = this;
    	var promise = new Promise(function(resolve, reject){
			var promises = [];
			ids.forEach(function(id){
				promises.push(new Promise(function(modelResolve, modelReject){
					var model = self.get({'id' : id});
					if(force_fetch || !model){
						model = self.add({'id': id});
						model.fetch({
							success:function(returned){
								modelResolve(returned);
							},
							error:function(obj, error){
								modelReject(error);
							}
						});
					} else {
						modelResolve(model);
					}
				}));
			});
			Promise.all(promises).then(function(fetchedModels){
				var to_fetch = self.clone();
				to_fetch.reset();
				fetchedModels.forEach(function(entry){
					to_fetch.add(entry);
				});
				resolve(to_fetch);
			});
    	});
    	return promise;
    }
});

/**** USER-CENTERED MODELS ****/
var UserModel = BaseModel.extend({
	root_list : "user-list",
	defaults: {
		first_name: "Guest"
    },
    send_invitation_email:function(email, channel){
    	return mail_helper.send_mail(channel, email);
    },
    get_clipboard:function(){
    	return new ContentNodeModel(this.get("clipboard_tree"));
    }
});

var UserCollection = BaseCollection.extend({
	model: UserModel,
	list_name:"user-list",
});

var InvitationModel = BaseModel.extend({
	root_list : "invitation-list",
	defaults: {
		first_name: "Guest"
    },
    resend_invitation_email:function(channel){
    	return mail_helper.send_mail(channel, this.get("email"));
    }
});

var InvitationCollection = BaseCollection.extend({
	model: InvitationModel,
	list_name:"invitation-list",
});

/**** CHANNEL AND CONTENT MODELS ****/
var ContentNodeModel = BaseModel.extend({
	root_list:"contentnode-list",
	defaults: {
		title:"Untitled",
		children:[],
		tags:[],
		metadata:{
			"resource_size":0,
			"resource_count":0,
			"max_sort_order":1
		}
    },
	handle_file_data:function(){
		var self = this;
		var promise = new Promise(function(resolve, reject){
			if(self.get("kind") === "topic"){
				resolve(self);
			}else{
				var promises = [];
				self.get("files").forEach(function(file){
					if(file.attributes){
						promises.push(new Promise(function(fileResolve, fileReject){
							var data = file.pick("file_size", "contentnode", "preset");
							file.save(data,{
								success:function(file){
									fileResolve(file);
								},
								error:function(obj, error){
									fileReject(error);
								}
							});
						}));
					}
				});
				Promise.all(promises).then(function(files){
					self.set("files", files);
					resolve(self);
				});
			}
		});
		return promise;
	}
});

var ContentNodeCollection = BaseCollection.extend({
	model: ContentNodeModel,
	list_name:"contentnode-list",
	highest_sort_order: 1,

	save: function() {
		var self = this;
		var promise = new Promise(function(saveResolve, saveReject){
			var promises = [];
			self.forEach(function(node){
    			promises.push(node.handle_file_data());
			});

			Promise.all(promises).then(function(nodes){
				Backbone.sync("update", self, {
		        	url: self.model.prototype.urlRoot(),
		        	success: function(data){
		        		saveResolve(new ContentNodeCollection(data));
		        	},
		        	error:function(obj, error){
		        		saveReject(error);
		        	}
		        });
			});

		});
        return promise;
	},
    sort_by_order:function(){
    	this.comparator = function(node){
    		return node.get("sort_order");
    	};
    	this.sort();
    	this.highest_sort_order = (this.length > 0)? this.at(this.length - 1).get("sort_order") : 1;
    },
    duplicate:function(target_parent){
    	var self = this;
    	var promise = new Promise(function(resolve, reject){
    		var copied_list = [];
	    	self.forEach(function(node){
	    		copied_list.push(node.get("id"));
	    	});
			var sort_order =(target_parent) ? target_parent.get("metadata").max_sort_order + 1 : 1;
	        var parent_id = target_parent.get("id");

	        var data = {"node_ids": copied_list.join(" "),
	                    "sort_order": sort_order,
	                    "target_parent": parent_id};
	        $.ajax({
	        	method:"POST",
	            url: window.Urls.duplicate_nodes(),
	            data:  JSON.stringify(data),
	            success: function(data) {
	                copied_list = JSON.parse(data).node_ids.split(" ");
	                self.get_all_fetch(copied_list).then(function(fetched){
	    				resolve(fetched);
	    			});
	            },
	            error:function(e){
	            	reject(e);
	            }
	        });
    	});
    	return promise;
    },
    move:function(target_parent, sort_order){
    	var self = this;
		var promise = new Promise(function(resolve, reject){
			self.forEach(function(model){
				model.set({
					parent: target_parent.id,
					sort_order:++sort_order
				});
	    	});
	    	self.save().then(function(collection){
	    		resolve(collection);
	    	});
		});
        return promise;
	},
	create_node_for_file:function(title, file, size){
		var self = this;
        var promise = new Promise(function(resolve, reject){
			self.create({
                title : title,
                parent : null,
                children : [],
                kind: file.get("recommended_kind"),
                license: 1,
                total_file_size : 0,
                tags : [],
                sort_order : 1,
            }, {
            	/* TODO: Find way to avoid database locking to remove async:false */
            	async:false,
            	success:function(created){
            		created.set({
                        original_node : created.get("id"),
                        cloned_source : created.get("id")
                    });

                    file.set({
                        file_size : size,
                        contentnode: created.id
                    });
            		resolve(created);
            	},
            	error:function(obj, error){
            		reject(error);
            	}
            });
        });
        return promise;
    },
});

var ChannelModel = BaseModel.extend({
    //idAttribute: "channel_id",
	root_list : "channel-list",
	defaults: {
		name: " ",
		editors: [],
		pending_editors: [],
		author: "Anonymous",
		license_owner: "No license found",
		description:" "
    },

    get_root:function(tree_name){
    	return new ContentNodeModel(this.get(tree_name));
    },

    publish:function(callback){
        var data = {"channel_id": this.get("id")};
        $.ajax({
        	method:"POST",
            url: window.Urls.publish_channel(),
            data:  JSON.stringify(data),
            success:function(){
            	callback();
            }
        });
    }
});

var ChannelCollection = BaseCollection.extend({
	model: ChannelModel,
	list_name:"channel-list"
});

var TagModel = BaseModel.extend({
	root_list : "contenttag-list",
	defaults: {
		tag_name: "Untagged"
    }
});

var TagCollection = BaseCollection.extend({
	model: TagModel,
	list_name:"contenttag-list",
	get_or_fetch:function(id){
		var tag = this.get(id);
		if(!tag){
			tag = new TagModel({"id":id});
			tag.fetch({async:false});
			if(tag){
				this.add(tag);
			}
			this.fetch({async:false})
		}
		return tag;
	}
});

/**** MODELS SPECIFIC TO FILE NODES ****/
var FileModel = BaseModel.extend({
	root_list:"file-list"
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
	attached_format: null
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
	ChannelModel: ChannelModel,
	ChannelCollection: ChannelCollection,
	TagModel: TagModel,
	TagCollection:TagCollection,
	FileFormatCollection:FileFormatCollection,
	LicenseCollection:LicenseCollection,
	FileCollection: FileCollection,
	FileModel: FileModel,
	FormatPresetModel: FormatPresetModel,
	FormatPresetCollection: FormatPresetCollection,
	ContentKindModel: ContentKindModel,
	ContentKindCollection : ContentKindCollection,
	UserModel:UserModel,
	UserCollection:UserCollection,
	InvitationModel: InvitationModel,
	InvitationCollection: InvitationCollection
}
