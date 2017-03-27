var Backbone = require("backbone");
var _= require("underscore");
var mail_helper = require("edit_channel/utils/mail");

/**** BASE MODELS ****/
var BaseModel = Backbone.Model.extend({
	root_list:null,
	model_name:"Model",
	urlRoot: function() {
		return window.Urls[this.root_list]();
	},
	toJSON: function() {
	  var json = Backbone.Model.prototype.toJSON.apply(this, arguments);
	  json.cid = this.cid;
	  return json;
	},
	getName:function(){
		return this.model_name;
	}
});

var BaseCollection = Backbone.Collection.extend({
	list_name:null,
	model_name:"Collection",
	url: function() {
		return window.Urls[this.list_name]();
	},
	save: function(callback) {
        Backbone.sync("update", this, {url: this.model.prototype.urlRoot()});
	},
	get_all_fetch: function(ids, force_fetch){
		force_fetch = (force_fetch)? true : false;
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
    },
    destroy:function(){
    	var self = this;
    	return new Promise(function(resolve, reject){
    		var promise_list = [];
	    	self.forEach(function(model){
	    		promise_list.push(new Promise(function(subresolve, subreject){
	    			model.destroy({
	    				success:function(){
	    					subresolve(true);
	    				},
	    				error:function(error){
	    					subreject(error);
	    				}
	    			})
	    		}))
	    	});
	    	Promise.all(promise_list).then(function(){
	    		resolve(true);
	    	});
    	});
    },
    getName:function(){
		return this.model_name;
	}
});

/**** USER-CENTERED MODELS ****/
var UserModel = BaseModel.extend({
	root_list : "user-list",
	model_name:"UserModel",
	defaults: {
		first_name: "Guest"
    },
    send_invitation_email:function(email, channel, share_mode){
    	return mail_helper.send_mail(channel, email, share_mode);
    },
    get_clipboard:function(){
    	return  new ContentNodeModel(this.get("clipboard_tree"));
    },
    get_full_name: function(){
    	return this.get('first_name') + " " + this.get('last_name');
    }
});

var UserCollection = BaseCollection.extend({
	model: UserModel,
	list_name:"user-list",
    model_name:"UserCollection"
});

var InvitationModel = BaseModel.extend({
	root_list : "invitation-list",
	model_name:"InvitationModel",
	defaults: {
		first_name: "Guest"
    },
    resend_invitation_email:function(channel){
    	return mail_helper.send_mail(channel, this.get("email"), this.get("share_mode"));
    }
});

var InvitationCollection = BaseCollection.extend({
	model: InvitationModel,
	list_name:"invitation-list",
    model_name:"InvitationCollection"
});

/**** CHANNEL AND CONTENT MODELS ****/
var ContentNodeModel = BaseModel.extend({
	root_list:"contentnode-list",
	model_name:"ContentNodeModel",
	defaults: {
		title:"Untitled",
		children:[],
		tags:[],
		assessment_items:[],
		metadata: {"resource_size" : 0, "resource_count" : 0},
		created: new Date(),
		ancestors: [],
		extra_fields: {}
    },
    initialize: function () {
		if (this.get("extra_fields") && typeof this.get("extra_fields") !== "object"){
			this.set("extra_fields", JSON.parse(this.get("extra_fields")))
		}
	},
	parse: function(response) {
    	if (response !== undefined && response.extra_fields) {
    		response.extra_fields = JSON.parse(response.extra_fields);
    	}
	    return response;
	},
	toJSON: function() {
	    var attributes = _.clone(this.attributes);
	    if (typeof attributes.extra_fields !== "string") {
		    attributes.extra_fields = JSON.stringify(attributes.extra_fields);
		}
	    return attributes;
	},
	setExtraFields:function(){
		if(typeof this.get('extra_fields') === 'string'){
			this.set('extra_fields', JSON.parse(this.get('extra_fields')));
		}
		if(this.get('kind') === 'exercise'){
			var data = (this.get('extra_fields'))? this.get('extra_fields') : {};
			data['mastery_model'] = (data['mastery_model'])? data['mastery_model'] : window.preferences.mastery_model;
		    data['m'] = (data['m'])? data['m'] : window.preferences.m_value;
		    data['n'] = (data['n'])? data['n'] : window.preferences.n_value;
		    data['randomize'] = (data['randomize'] !== undefined)? data['randomize'] : window.preferences.auto_randomize_questions;
		    this.set('extra_fields', data);
		}
	}
});

var ContentNodeCollection = BaseCollection.extend({
	model: ContentNodeModel,
	list_name:"contentnode-list",
	highest_sort_order: 1,
    model_name:"ContentNodeCollection",

	save: function() {
		var self = this;
		return new Promise(function(saveResolve, saveReject){
			var fileCollection = new FileCollection();
			var assessmentCollection = new AssessmentItemCollection();
			self.forEach(function(node){
				node.get("files").forEach(function(file){
					file.preset.id = file.preset.name ? file.preset.name : file.preset.id;
				});

				fileCollection.add(node.get("files"));
				assessmentCollection.add(node.get('assessment_items'));
			});
			Promise.all([fileCollection.save(), assessmentCollection.save()]).then(function() {
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
	comparator : function(node){
    	return node.get("sort_order");
    },
    sort_by_order:function(){
    	this.sort();
    	this.highest_sort_order = (this.length > 0)? this.at(this.length - 1).get("sort_order") : 1;
    },
    duplicate:function(target_parent){
    	var self = this;
    	var promise = new Promise(function(resolve, reject){
			var sort_order =(target_parent) ? target_parent.get("metadata").max_sort_order + 1 : 1;
	        var parent_id = target_parent.get("id");

	        var data = {"nodes": self.toJSON(),
	                    "sort_order": sort_order,
	                    "target_parent": parent_id,
	                    "channel_id": window.current_channel.id
	        };
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
    move:function(target_parent){
    	var self = this;
    	var promise = new Promise(function(resolve, reject){
	        var data = {"nodes" : self.toJSON(),
	                    "target_parent" : target_parent.get("id"),
	                    "channel_id" : window.current_channel.id
	        };
	        $.ajax({
	        	method:"POST",
	            url: window.Urls.move_nodes(),
	            data:  JSON.stringify(data),
	            success: function(data) {
	            	resolve(JSON.parse(data).nodes);
	            },
	            error:function(e){
	            	reject(e);
	            }
	        });
    	});
    	return promise;
	}
});

var ChannelModel = BaseModel.extend({
    //idAttribute: "channel_id",
	root_list : "channel-list",
	defaults: {
		name: "",
		description:"",
		thumbnail_url: "/static/img/kolibri_placeholder.png",
		count: 0,
		size: 0,
		published: false,
		view_only: false
    },
    model_name:"ChannelModel",
    get_root:function(tree_name){
    	return new ContentNodeModel(this.get(tree_name));
    },

    publish:function(callback){
    	var self = this;
    	return new Promise(function(resolve, reject){
    		var data = {"channel_id": self.get("id")};
	        $.ajax({
	        	method:"POST",
	            url: window.Urls.publish_channel(),
	            data:  JSON.stringify(data),
	            success:function(){
	            	resolve(true);
	            },
	            error:function(error){
	            	reject(error);
	            }
	        });
    	});
    },
    get_accessible_channel_roots:function(){
		var self = this;
    	var promise = new Promise(function(resolve, reject){
	        $.ajax({
	        	method:"POST",
	        	data: JSON.stringify({'channel_id': self.id}),
	            url: window.Urls.accessible_channels(),
	            success: function(data) {
	            	resolve(new ContentNodeCollection(JSON.parse(data)));
	            },
	            error:function(e){
	            	reject(e);
	            }
	        });
    	});
    	return promise;
	}
});

var ChannelCollection = BaseCollection.extend({
	model: ChannelModel,
	list_name:"channel-list",
    model_name:"ChannelCollection",
	comparator:function(channel){
		return -new Date(channel.get('created'));
	}
});

var TagModel = BaseModel.extend({
	root_list : "contenttag-list",
	model_name:"TagModel",
	defaults: {
		tag_name: "Untagged"
    }
});

var TagCollection = BaseCollection.extend({
	model: TagModel,
	list_name:"contenttag-list",
    model_name:"TagCollection",
	get_all_fetch:function(ids){
		var self = this;
		var fetched_collection = new TagCollection();
		ids.forEach(function(id){
			var tag = self.get(id);
			if(!tag){
				tag = new TagModel({"id":id});
				tag.fetch({async:false});
				if(tag){
					self.add(tag);
				}
			}
			fetched_collection.add(tag);
		});
		return fetched_collection;
	}
});

/**** MODELS SPECIFIC TO FILE NODES ****/
var FileModel = BaseModel.extend({
	root_list:"file-list",
	model_name:"FileModel",
	get_preset:function(){
		return window.formatpresets.get({'id':this.get("id")});
	}
});

var FileCollection = BaseCollection.extend({
	model: FileModel,
	list_name:"file-list",
    model_name:"FileCollection",
	get_or_fetch: function(data){
		var newCollection = new FileCollection();
		newCollection.fetch({
			traditional:true,
			data: data
		});
		var file = newCollection.findWhere(data);
    	return file;
    },
    sort_by_preset:function(presets){
    	this.comparator = function(file){
    		return presets.findWhere({id: file.get("preset").id}).get("order");
    	};
    	this.sort();
    },
    save: function() {
    	var self = this;
    	return new Promise(function(resolve, reject){
    		Backbone.sync("update", self, {
    			url: self.model.prototype.urlRoot(),
    			success:function(data){
    				resolve(new FileCollection(data));
    			},
    			error:function(error){
    				reject(error);
    			}
    		});
    	});
	}
});

var FormatPresetModel = BaseModel.extend({
	root_list:"formatpreset-list",
	attached_format: null,
    model_name:"FormatPresetModel"
});

var FormatPresetCollection = BaseCollection.extend({
	model: FormatPresetModel,
	list_name:"formatpreset-list",
    model_name:"FormatPresetCollection",
	sort_by_order:function(){
    	this.sort();
    },
    comparator: function(preset){
    	return preset.get("order");
    }
});


/**** PRESETS AUTOMATICALLY GENERATED UPON FIRST USE ****/
var FileFormatModel = Backbone.Model.extend({
	root_list: "fileformat-list",
	model_name:"FileFormatModel",
	defaults: {
		extension:"invalid"
    }
});

var FileFormatCollection = BaseCollection.extend({
	model: FileFormatModel,
	list_name:"fileformat-list",
	model_name:"FileFormatCollection"
});

var LicenseModel = BaseModel.extend({
	root_list:"license-list",
	model_name:"LicenseModel",
	defaults: {
		license_name:"Unlicensed",
		exists: false
    }
});

var LicenseCollection = BaseCollection.extend({
	model: LicenseModel,
	list_name:"license-list",
	model_name:"LicenseCollection",

    get_default:function(){
    	return this.findWhere({license_name:"CC-BY"});
    }
});

var LanguageModel = BaseModel.extend({
	root_list:"language-list",
	model_name:"LanguageModel"
});

var LanguageCollection = BaseCollection.extend({
	model: LanguageModel,
	list_name:"language-list",
	model_name:"LanguageCollection"
});

var ContentKindModel = BaseModel.extend({
	root_list:"contentkind-list",
	model_name:"ContentKindModel",
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
	model_name:"ContentKindCollection",
    get_default:function(){
    	return this.findWhere({kind:"topic"});
    }
});

var ExerciseModel = BaseModel.extend({
	root_list:"exercise-list",
	model_name:"ExerciseModel"
});

var ExerciseCollection = BaseCollection.extend({
	model: ExerciseModel,
	list_name:"exercise-list",
	model_name:"ExerciseCollection"
});

var ExerciseItemCollection = Backbone.Collection.extend({
	comparator: function(item){
		return item.get('order');
	}
});

var AssessmentItemModel = BaseModel.extend({
	root_list:"assessmentitem-list",
	model_name:"AssessmentItemModel",
	defaults: {
		type: "single_selection",
		question: "",
		answers: "[]",
		hints: "[]",
		files: []
	},

	initialize: function () {
		if (typeof this.get("answers") !== "object") {
			this.set("answers", new ExerciseItemCollection(JSON.parse(this.get("answers"))), {silent: true});
		}
		if (typeof this.get("hints") !== "object"){
			this.set("hints", new ExerciseItemCollection(JSON.parse(this.get("hints"))), {silent:true});
		}
	},

	parse: function(response) {
	    if (response !== undefined) {
	    	if (response.answers) {
	    		response.answers = new ExerciseItemCollection(JSON.parse(response.answers));
	    	}
	    	if(response.hints){
	    		response.hints = new ExerciseItemCollection(JSON.parse(response.hints));
	    	}
	    }
	    return response;
	},

	toJSON: function() {
	    var attributes = _.clone(this.attributes);
	    if (typeof attributes.answers !== "string") {
		    attributes.answers = JSON.stringify(attributes.answers.toJSON());
		}
		if (typeof attributes.hints !== "string") {
		    attributes.hints = JSON.stringify(attributes.hints.toJSON());
		}
	    return attributes;
	}
});

var AssessmentItemCollection = BaseCollection.extend({
	model: AssessmentItemModel,
	model_name:"AssessmentItemCollection",
	comparator : function(assessment_item){
    	return assessment_item.get("order");
    },
	get_all_fetch: function(ids, force_fetch){
		force_fetch = (force_fetch)? true : false;
    	var self = this;
    	var promise = new Promise(function(resolve, reject){
			var promises = [];
			ids.forEach(function(id){
				promises.push(new Promise(function(modelResolve, modelReject){
					var model = self.get(id);
					if(force_fetch || !model){
						model = self.add(id);
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
    },
    save:function(){
    	var self = this;
    	return new Promise(function(resolve, reject){
    		Backbone.sync("update", self, {
    			url: self.model.prototype.urlRoot(),
    			success:function(data){
    				resolve(new AssessmentItemCollection(data));
    			},
    			error:function(error){
    				reject(error);
    			}
    		});
    	});
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
	InvitationCollection: InvitationCollection,
	ExerciseModel:ExerciseModel,
	ExerciseCollection:ExerciseCollection,
	AssessmentItemModel:AssessmentItemModel,
	AssessmentItemCollection:AssessmentItemCollection,
}