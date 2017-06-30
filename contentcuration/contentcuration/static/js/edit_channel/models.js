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
                        success:subresolve,
                        error:subreject
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
    },
    get_channels: function(){
        var self = this;
        return new Promise(function(resolve, reject){
            $.ajax({
                method:"GET",
                url: window.Urls.get_user_channels(),
                error: reject,
                success: function(data) {
                    resolve(new ChannelCollection(JSON.parse(data)));
                }
            });
        });
    },
    get_pending_invites: function(){
        var self = this;
        return new Promise(function(resolve, reject){
            $.ajax({
                method:"GET",
                url: window.Urls.get_user_pending_channels(),
                error: reject,
                success: function(data) {
                    resolve(new InvitationCollection(JSON.parse(data)));
                }
            });
        });
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
    },
    accept_invitation:function(){
        var self = this;
        return new Promise(function(resolve, reject){
            $.ajax({
                method:"POST",
                url: window.Urls.accept_channel_invite(),
                data:  JSON.stringify({ "invitation_id" : self.id }),
                error: reject,
                success: function(data){
                    resolve(new ChannelModel(JSON.parse(data)));
                }
            });
        });
    },
    decline_invitation:function(){
        var self = this;
        return new Promise(function(resolve, reject){
            self.destroy({ success: resolve, error: reject });
        });
    }
});

var InvitationCollection = BaseCollection.extend({
    model: InvitationModel,
    list_name:"invitation-list",
    model_name:"InvitationCollection"
});

/**** CHANNEL AND CONTENT MODELS ****/
function fetch_nodes(ids, url){
    return new Promise(function(resolve, reject){
        if(ids.length === 0) {
            resolve(new ContentNodeCollection()); // No need to make a call to the server
        }
        $.ajax({
            method:"POST",
            url: url,
            data:  JSON.stringify(ids),
            error: reject,
            success: function(data) {
                resolve(new ContentNodeCollection(JSON.parse(data)));
            }
        });
    });
}
function fetch_nodes_by_ids(ids){
    return fetch_nodes(ids, window.Urls.get_nodes_by_ids());
}

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
    generate_thumbnail:function(){
        var self = this;
        return new Promise(function(resolve, reject){
            $.ajax({
                method:"POST",
                url: window.Urls.generate_thumbnail(),
                data:  JSON.stringify({"node_id": self.id}),
                success: function(result) {
                    file = JSON.parse(result).file
                    resolve(new FileModel(JSON.parse(file)));
                },
                error:reject
            });
        });
    },
    has_related_content: function(){
        return this.get('prerequisite').length || this.get('is_prerequisite_of').length;
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
    },
    calculate_size: function(){
        var self = this;
        var promise = new Promise(function(resolve, reject){
            $.ajax({
                method:"POST",
                url: window.Urls.get_total_size(),
                data:  JSON.stringify([self.id]),
                error:reject,
                success: function(data) {
                    resolve(JSON.parse(data).size);
                }
            });
        });
        return promise;
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
            var numParser = require("edit_channel/utils/number_parser");
            var fileCollection = new FileCollection();
            var assessmentCollection = new AssessmentItemCollection();
            self.forEach(function(node){
                node.get("files").forEach(function(file){
                    var to_add = new FileModel(file);
                    var preset_data = to_add.get("preset");
                    preset_data.id = file.preset.name || file.preset.id;
                    to_add.set('preset', preset_data);
                    to_add.set('contentnode', node.id);
                    fileCollection.add(to_add);
                });
                assessmentCollection.add(node.get('assessment_items'));
                assessmentCollection.forEach(function(item){
                    item.set('contentnode', node.id);
                    if(item.get('type') === 'input_question'){
                        item.get('answers').each( function(a){
                            var value = numParser.extract_value(a.get('answer'))
                            a.set('answer', (value)? value.toString() : "");
                        });
                    }
                })
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
    },
    has_prerequisites: function(){
        return this.some(function(model) { return model.get('prerequisite').length; })
    },
    has_postrequisites: function(){
        return this.some(function(model) { return model.get('is_prerequisite_of').length; })
    },
    has_related_content: function(){
        return this.has_prerequisites() || this.has_postrequisites();
    },
    get_prerequisites: function(ids, get_postrequisites){
        var self = this;
        return new Promise(function(resolve, reject){
            $.ajax({
                method:"POST",
                url: window.Urls.get_prerequisites(),
                data:  JSON.stringify({"nodes": ids, "get_postrequisites": get_postrequisites}),
                success: function(data) {
                    nodes = JSON.parse(data);
                    resolve({
                        "prerequisite_mapping": nodes.prerequisite_mapping,
                        "postrequisite_mapping": nodes.postrequisite_mapping,
                        "prerequisite_tree_nodes": new ContentNodeCollection(JSON.parse(nodes.prerequisite_tree_nodes)),
                    });
                },
                error:reject
            });
        });
    },
    calculate_size: function(){
        var self = this;
        return new Promise(function(resolve, reject){
            $.ajax({
                method:"POST",
                url: window.Urls.get_total_size(),
                data:  JSON.stringify(self.pluck('id')),
                success: function(data) {
                    resolve(JSON.parse(data).size);
                },
                error:reject
            });
        });
    },
    create_new_node: function(data){
        var self = this;
        return new Promise(function(resolve, reject){
            $.ajax({
                method:"POST",
                url: window.Urls.create_new_node(),
                data:  JSON.stringify(data),
                success: function(data) {
                    var new_node = new ContentNodeModel(JSON.parse(data));
                    self.add(new_node);
                    resolve(new_node);
                },
                error:reject
            });
        });
    },
    has_all_data: function(){
        return this.every(function(node){
            var files_objects = _.every(node.get('files'), function(file){
                return typeof file == 'object';
            });
            var ai_objects = _.every(node.get('assessment_items'), function(ai){
                return typeof ai == 'object';
            });
            return files_objects && ai_objects;
        });
    },
    get_all_fetch: function(ids, force_fetch){
        return this.get_fetch_nodes(ids, window.Urls.get_nodes_by_ids(), force_fetch);
    },
    get_all_fetch_simplified: function(ids, force_fetch){
        return this.get_fetch_nodes(ids, window.Urls.get_nodes_by_ids_simplified(), force_fetch);
    },
    fetch_nodes_by_ids_complete: function(ids, force_fetch){
        return this.get_fetch_nodes(ids, window.Urls.get_nodes_by_ids_complete(), force_fetch);
    },
    get_fetch_nodes: function(ids, url, force_fetch){
        force_fetch = (force_fetch)? true : false;
        var self = this;
        return new Promise(function(resolve, reject){
            var idlists = _.partition(ids, function(id){return force_fetch || !self.get({'id': id});});
            var returnCollection = new ContentNodeCollection(self.filter(function(n){ return idlists[1].indexOf(n.id) >= 0; }))
            fetch_nodes(idlists[0], url).then(function(fetched){
                returnCollection.add(fetched.toJSON());
                self.add(fetched.toJSON());
                self.sort();
                resolve(returnCollection);
            });
        });
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
        return new Promise(function(resolve, reject){
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
                    resolve(new ContentNodeCollection(JSON.parse(data)));
                },
                error:reject
            });
        });
    },
    move:function(target_parent, max_order, min_order){
        var self = this;
        return new Promise(function(resolve, reject){
            var data = {
                "nodes" : self.toJSON(),
                "target_parent" : target_parent.get("id"),
                "channel_id" : window.current_channel.id,
                "max_order": max_order,
                "min_order": min_order
            };
            $.ajax({
                method:"POST",
                url: window.Urls.move_nodes(),
                data:  JSON.stringify(data),
                error:reject,
                success: function(moved) {
                    resolve(new ContentNodeCollection(JSON.parse(moved)));
                }
            });
        });
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
        view_only: false,
        viewers: []
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
        return new Promise(function(resolve, reject){
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
    },
    activate_channel:function(){
        var self = this;
        return new Promise(function(resolve, reject){
            $.ajax({
                method:"POST",
                data: JSON.stringify({'channel_id': self.id}),
                url: window.Urls.activate_channel(),
                success: resolve,
                error:function(error){reject(error.responseText);}
            });
        });
    },
    get_staged_diff: function(){
        var self = this;
        return new Promise(function(resolve, reject){
            $.ajax({
                method:"POST",
                data: JSON.stringify({'channel_id': self.id}),
                url: window.Urls.get_staged_diff(),
                success: function(data){
                    resolve(JSON.parse(data))
                },
                error:function(error){reject(error.responseText);}
            });
        });
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
    },
    initialize: function () {
        this.set_preset(this.get("preset"), this.get("language"));
    },
    set_preset: function(preset, language){
        if(preset && language &&
            !preset.id.endsWith("_" + language.id)){
            var preset_data = preset;
            preset_data.name = preset_data.id;
            preset_data.id = preset_data.id + "_" + language.id;
            preset_data.readable_name = language.readable_name;
            this.set("preset", preset_data);
        }
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
    save: function() {
        var self = this;
        return new Promise(function(resolve, reject){
            Backbone.sync("update", self, {
                url: self.model.prototype.urlRoot(),
                success:function(data){
                    resolve(new FileCollection(data));
                },
                error:reject
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
    comparator : function(preset){
        return [preset.get('order'), preset.get('readable_name')];
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
    },
    comparator: function(license){
        return license.id;
    }
});

var LanguageModel = BaseModel.extend({
    root_list:"language-list",
    model_name:"LanguageModel"
});

var LanguageCollection = BaseCollection.extend({
    model: LanguageModel,
    list_name:"language-list",
    model_name:"LanguageCollection",
    comparator: function(language){
        return language.get("readable_name");
    }
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
    fetch_nodes_by_ids: fetch_nodes_by_ids,
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
    LanguageModel : LanguageModel,
    LanguageCollection : LanguageCollection,
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