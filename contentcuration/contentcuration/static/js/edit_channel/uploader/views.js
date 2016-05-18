var Backbone = require("backbone");
var _ = require("underscore");
require("uploader.less");
var BaseViews = require("edit_channel/views");
var Models = require("edit_channel/models");
var Dropzone = require("dropzone");
require("uploader.less");
require("dropzone/dist/dropzone.css");
var get_cookie = require("utils/get_cookie");
//var ExerciseViews = require("edit_channel/exercise_creation/views");

var AddContentView = BaseViews.BaseListView.extend({
    template: require("./hbtemplates/add_content_dialog.handlebars"),
    header_template: require("./hbtemplates/add_content_header.handlebars"),
    modal_template: require("./hbtemplates/uploader_modal.handlebars"),
    next_header_template: require("./hbtemplates/edit_metadata_header.handlebars"),
    item_view:"uploading_content",
    counter:0,
    initialize: function(options) {
        _.bindAll(this, 'add_topic', 'edit_metadata','add_file','close', 'add_exercise');
        this.collection = options.collection;
        this.main_collection = options.main_collection;
        this.parent_view = options.parent_view;
        this.modal = options.modal;
        this.render();
    },
    render: function() {
        if(this.modal){
            this.$el.html(this.modal_template());
            this.$(".modal-title").prepend(this.header_template({
                title:this.model.get("title"),
                is_root: this.model.get("parent") == null
            }));
            this.$(".modal-body").html(this.template({
                node_list: this.collection.toJSON()
            }));
            this.$el.append(this.el);
            this.$el.find(".modal").modal({show: true, backdrop: 'static', keyboard: false});
            this.$el.find(".modal").on("hide.bs.modal", this.close);
        }else{
            this.$el.html(this.template({
                node_list: this.collection.toJSON()
            }));
            this.$el.prepend(this.header_template({
                title:this.model.get("title"),
                is_root: this.model.get("parent") == null
            }));
        }
        this.load_content();
    },
    events: {
        'click #create_topic':'add_topic',
        'click .edit_metadata' : 'edit_metadata',
        'click #upload_file' : 'add_file',
        'click #create_exercise' : 'add_exercise'
    },

    /*Render any items that have previously been added*/
    load_content:function(){
        var self = this;
        if(this.collection){
            this.collection.forEach(function(entry){
                var node_view = new NodeListItem({
                    containing_list_view: self,
                    el: self.$el.find("#content_item_" + entry.cid),
                    model: entry,
                    root: this.model
                });
                self.views.push(node_view);
            });
        }
    },
    add_topic:function(){
        var topic = new Models.NodeModel({
            "kind":"topic",
            "title": (this.counter > 0)? "Topic " + this.counter : "Topic",
            "parent" : this.model.id,
            "sort_order" : this.main_collection.length + this.collection.length
        });
        this.collection.add(topic);
        this.counter++;
        var item_view = new NodeListItem({
            containing_list_view: this,
            model: topic,
            root: this.model
        });
        $("#upload_content_add_list").append(item_view.el);
        this.views.push(item_view);
    },
    edit_metadata: function(){
        if(this.modal){
            this.$el.find(".modal").modal("hide");
        }else{
            this.close();
        }
        $("#main-content-area").append("<div id='dialog'></div>");
        var metadata_view = new EditMetadataView({
            el : $("#dialog"),
            collection: this.collection,
            parent_view: this.parent_view,
            model: this.model,
            allow_add: true,
            main_collection : this.main_collection,
            modal: true
        });
    },
    add_file:function(){
        var view = new FileUploadView({
            callback: this.upload_file,
            modal: true,
            parent_view: this
        });
    },
    upload_file:function(file_list){
        console.log("uploading files", file_list);
        var self = this.parent_view;

        file_list.forEach(function(entry){
            console.log("this is now", self);
            var type = "";
            var file = entry.data;
            var filename = entry.filename;
            if(file.type.indexOf("image") >=0){
                type = "image";
            }
            else if(file.type.indexOf("application/pdf") >=0){
                type="pdf";
            }
            else if(file.type.indexOf("text") >=0){
                type="text";
            }
            else if(file.type.indexOf("audio") >=0){
                type="audio";
            }
            else if(file.type.indexOf("video") >=0){
                type="video";
            }
            var content_node = new Models.NodeModel({
                "kind":type,
                "title": file.name.split(".")[0],
                "parent" : self.model.id,
                "total_file_size": file.size,
                "created" : file.lastModifiedDate,
                "original_filename" : file.name,
                "sort_order": self.main_collection.length + self.collection.length
            });
            self.collection.add(content_node);
            var item_view = new NodeListItem({
                containing_list_view: self,
                model: content_node
            });
            content_node.attributes.file_data = {data:file, filename:entry.filename};
            $("#upload_content_add_list").append(item_view.el);
            item_view.$el.data("file", entry);
            self.views.push(item_view);
            console.log("CREATED MODEL: ", content_node);
        });
    },
    add_exercise:function(){
        var view = new ExerciseCreateView({
            callback: this.create_exercise,
            modal: true,
            parent_view: this,
            model: this.model
        });
    },
    create_exercise:function(exercise_list){
        console.log("exercises", exercise_list);
    },
    close: function() {
        this.delete_view();
    }
});

var UploadItemView = BaseViews.BaseView.extend({
    template: null,
    modal_template: null,
    file_list : [],
    callback:null,
    close: function() {
        if (this.modal) {
            this.$(".modal").modal('hide');
        }
        this.remove();
    },
    close_file_uploader:function(){
      this.callback(this.file_list);
      this.close();
    }
});


var FileUploadView = UploadItemView.extend({
    template: require("./hbtemplates/file_upload.handlebars"),
    modal_template: require("./hbtemplates/file_upload_modal.handlebars"),
    file_upload_template : require("./hbtemplates/file_upload_item.handlebars"),
    acceptedFiles : "image/*,application/pdf,video/*,text/*,audio/*",

    initialize: function(options) {
        _.bindAll(this, "file_uploaded",  "close_file_uploader", "all_files_uploaded", "file_added", "file_removed");
        this.callback = options.callback;
        this.modal = options.modal;
        this.parent_view = options.parent_view;
        this.render();
    },
    events:{
      "click .submit_uploaded_files" : "close_file_uploader"
    },

    render: function() {
        if (this.modal) {
            this.$el.html(this.modal_template());
            this.$(".modal-body").append(this.template());
            $("body").append(this.el);
            this.$(".modal").modal({show: true});
            this.$(".modal").on("hide.bs.modal", this.close);
        } else {
            this.$el.html(this.template());
        }
        this.file_list = [];

        // TODO parameterize to allow different file uploads depending on initialization.
        this.dropzone = new Dropzone(this.$("#dropzone").get(0), {
            clickable: ["#dropzone", ".fileinput-button"],
            acceptedFiles: this.acceptedFiles,
            url: window.Urls.file_upload(),
            previewTemplate:this.file_upload_template(),
            parallelUploads: 20,
            //autoQueue: false, // Make sure the files aren't queued until manually added
            previewsContainer: "#dropzone", // Define the container to display the previews
            headers: {"X-CSRFToken": get_cookie("csrftoken")},
            addRemoveLinks: true
        });
        this.dropzone.on("success", this.file_uploaded);

        // Only enable the submit upload files button once all files have finished uploading.
        this.dropzone.on("queuecomplete", this.all_files_uploaded);

        // Disable the submit upload files button if a new file is added to the queue.
        this.dropzone.on("addedfile", this.file_added);

        this.dropzone.on("removedfile", this.file_removed);
    },
    file_uploaded: function(file) {
        console.log("FILE FOUND:", file);
        this.file_list.push({
            "data" : file,
            "filename": JSON.parse(file.xhr.response).filename
        });
    },
    disable_submit: function() {
        this.$(".submit_uploaded_files").attr("disabled", "disabled");
    },
    enable_submit: function() {
        this.$(".submit_uploaded_files").removeAttr("disabled");
    },
    all_files_uploaded: function() {
        this.enable_submit();
    },
    file_added: function() {
        this.disable_submit();
    },

    file_removed: function(file) {
        this.file_list.splice(this.file_list.indexOf(file), 1);
        if (this.file_list.length === 0) {
            this.disable_submit();
        }
    }
});

var EditMetadataView = BaseViews.BaseEditorView.extend({
	template : require("./hbtemplates/edit_metadata_dialog.handlebars"),
	modal_template: require("./hbtemplates/uploader_modal.handlebars"),
	header_template: require("./hbtemplates/edit_metadata_header.handlebars"),
    description_limit : 400,

	initialize: function(options) {
		_.bindAll(this, 'close_uploader', "save_and_keep_open", 'check_item',
						'add_tag','save_and_finish','add_more','set_edited',
						'render_details', 'render_preview', 'remove_tag', 'update_count');
		this.parent_view = options.parent_view;
		this.collection = (options.collection)? options.collection : new Models.NodeCollection();
		this.allow_add = options.allow_add;
		this.modal = options.modal;
		this.main_collection = options.main_collection;
		this.render();
		this.switchPanel(true);
	},
	render: function() {
		if(this.modal){
			this.$el.html(this.modal_template());
			this.$(".modal-title").prepend(this.header_template());
	        this.$(".modal-body").html(this.template({
				node_list: this.collection.toJSON(),
				multiple_selected: this.collection.length > 1 || this.allow_add,
				allow_add: this.allow_add,
                word_limit : this.description_limit
			}));
	        $("body").append(this.el);
	        this.$(".modal").modal({show: true, backdrop: 'static', keyboard: false});
        	this.$(".modal").on("hide.bs.modal", this.close_uploader);
		}else{
			this.$el.html(this.template({
				node_list: this.collection.toJSON(),
				multiple_selected: this.collection.length > 1 || this.allow_add,
				allow_add: this.allow_add,
                word_limit : this.description_limit
			}));
		}
		this.preview_view = new PreviewView({
			modal:false,
			el: $("#metadata_preview"),
			model:this.current_node
		});

		this.gray_out(true);
		this.$el.find(".tag_input").addClass("gray-out");
		this.$el.find(".tag_input").prop("disabled", true);
        this.$el.find("#description_counter").html("Select an item first.");
		this.load_content();
	},
	events: {
		'click .close_uploader' : 'close_uploader',
		'click #upload_save_button' : 'save_and_keep_open',
		'click #upload_save_finish_button' : 'save_and_finish',
		'click #add_more_button' : 'add_more',
		'click #uploader' : 'finish_editing',
		'click li' : 'check_item',
		'keypress #tag_box' : 'add_tag',
		'keyup .upload_input' : 'set_edited',
		'click #metadata_details_btn' : 'render_details',
		'click #metadata_preview_btn' : 'render_preview',
		'click .delete_tag':'remove_tag',
        'keyup #input_description': 'update_count',
        'keydown #input_description': 'update_count',
        'paste #input_description': 'update_count'
	},
    update_count:function(){
        this.update_word_count(this.$el.find("#input_description"), this.$el.find("#description_counter"), this.description_limit);
    },
	load_content:function(){
		var self = this;
		this.views = [];
		if(this.collection.length <= 1 && !this.allow_add){
			var node_view = new UploadedItem({
				model: this.model,
				el: self.$el.find("#hidden_node"),
				containing_list_view: self
			});
			self.views.push(node_view);
			this.set_current(node_view);
		}else{
			this.collection.forEach(function(entry){
				console.log("view = ", entry);
				var node_view = new UploadedItem({
					model: entry,
					el: self.$el.find("#uploaded_list #item_" + entry.cid),
					containing_list_view: self,
				});
				self.views.push(node_view);
				if(self.collection.length ==1){
					self.set_current(node_view);
				}
			});

		}
	},
	render_details:function(){
		this.switchPanel(true);
	},
	render_preview:function(){
		this.switchPanel(false);
	},

	save_and_keep_open:function(){
		var self = this;
		this.check_and_save_nodes(null);
	},

	check_and_save_nodes: function(callback){
		this.$el.find("#validating_text").css("display", "inline");
		this.$el.find(".editmetadata_save").prop("disabled", true);
		this.$el.find(".editmetadata_save").css("pointer", "not-allowed");

		var self = this;
		setTimeout(function() {
           /* TODO :fix to save multiple nodes at a time */
			self.gray_out(false);
			self.parent_view.set_editing(false);
			self.errorsFound = false;
			self.$el.find("#description_error").html("");
			self.$el.find("#input_description").removeClass("error_input");

			self.check_nodes();
			self.$el.find(".editmetadata_save").prop("disabled", false);
			self.$el.find("#validating_text").css("display", "none");
			self.$el.find(".editmetadata_save").css("pointer", "cursor");

            self.add_tag(null);

			if(!self.errorsFound){
				self.$el.css("visibility", "hidden");
				self.display_load("Saving Content...", function(){
					self.save_nodes();
					if(!self.errorsFound){
						$(".uploaded").css("background-color", "white");
						self.$el.find("#title_error").html("");
						self.$el.find("#description_error").html("");
						if(self.multiple_selected){
							self.gray_out(true);
						}
					}
					if(!self.errorsFound && self.allow_add){
						self.parent_view.add_nodes(self.views, self.main_collection.length, false);
					}
					self.$el.css("visibility", "visible");
					if(callback){
						callback();
					}
				});
			}

        }, 200);
	},
	save_and_finish: function(event){
		var self = this;
		this.check_and_save_nodes(function(){
			if(self.modal){
				self.$el.find(".modal").modal("hide");
			}else{
				self.close_uploader(event);
			}
		});

	},
	add_more:function(event){
		this.save_queued();
		if(this.modal){
			this.$el.find(".modal").modal("hide");
		}else{
	        this.close_uploader(event);
		}
		$("#main-content-area").append("<div id='dialog'></div>");
		var content_view = new AddContentView({
			collection: this.collection,
			parent_view: this.parent_view,
			el: $("#dialog"),
			model: (this.allow_add)? this.model : null,
			main_collection : this.main_collection,
			modal:true
		});

		this.reset();
		this.undelegateEvents();
		this.unbind();
	},
	set_current_node:function(view){
		/* TODO implement once allow multi file editing
		if(this.current_node){
			this.current_node.set_edited(true);
			to_save.push(this.current_node);
		}*/
		this.$el.find("#title_error").html("");
		this.$el.find(".disable_on_error").css("cursor", "pointer");
		if(!this.current_view && !this.multiple_selected){
			this.set_current(view);
		}else {
			if(!this.multiple_selected){
				/* Previous node passes all tests */
				this.$el.find("#title_error").html("");
				this.$el.find("#description_error").html("");
				this.set_current(view);
			}
		}
	},
	set_current:function(view){
        this.$el.find("#uploaded_list .uploaded").removeClass("current_item");
		if(!this.multiple_selected){
			this.current_node = view.model;
			this.current_view = view;
		}else{
			this.current_node = this.collection.get({cid: view.model.cid});
			this.current_view = view;
		}
		this.load_preview();
		this.$el.find("#input_title").val(this.current_node.get("title"));
		this.$el.find("#input_description").val(this.current_node.get("description"));
        view.$el.addClass("current_item");
        view.$el.find("input[type=checkbox]").prop("checked", true);

		if(this.current_node.get("original_filename")){
			this.$el.find("#original_filename_area").css("display", "block");
			this.$el.find("#original_filename").html( this.current_node.get("original_filename"));
		}else{
			this.$el.find("#original_filename_area").css("display", "none");
		}
		$("#tag_area").html("");
		this.append_tags(this.current_view.tags);

        // Allows us to read either a node with nested metadata from the server, or an instantiated but unsaved node on the client side.
        var file_size = (((this.current_node.get("formats") || [])[0] || {}).format_size) || ((this.current_node.get("file_data") || {}).data || {}).size || "";
        this.$("#display_file_size").text(file_size);
        this.gray_out(false);
        this.update_word_count(this.$el.find("#input_description"), this.$el.find("#description_counter"), this.description_limit);
	},
	check_item: function(){
        this.$el.find("#uploaded_list .uploaded").removeClass("current_item");
		this.multiple_selected = this.$el.find("#uploaded_list :checked").length > 1;
		this.parent_view.set_editing(this.multiple_selected);
		this.$el.find("#input_title").val((this.multiple_selected || !this.current_node)? " " : this.current_node.get("title"));
		this.$el.find("#input_description").val((this.multiple_selected || !this.current_node)? " " : this.current_node.get("description"));

        if(this.$el.find("#uploaded_list :checked").length == 0){
			this.gray_out(true);
			this.$el.find(".tag_input").addClass("gray-out");
			this.$el.find(".tag_input").prop("disabled", true);
            this.$el.find("#description_counter").html("Select an item first.");
            $("#tag_area").html("");
			return;
		}
		if(this.multiple_selected) {
			this.gray_out(true);
			$("#tag_area").html("");
            this.$el.find("#description_counter").html("Cannot edit for multiple items.");
			var list = this.$el.find('#uploaded_list input:checked').parent("li");
            list.addClass("current_item");

			var tagList = $(list[0]).data("data").tags;
			/* Create list of nodes to edit */
			for(var i = 1; i < list.length; i++){
				tagList = $(tagList).filter($(list[i]).data("data").tags);
			}
			this.append_tags(tagList);
		}
		else {
			this.gray_out(false);
			this.set_current_node(this.$el.find("#uploaded_list :checked").parent("li").data("data"));
            this.$el.find("#uploaded_list :checked").parent("li").addClass("current_item");
            this.update_word_count(this.$el.find("#input_description"), this.$el.find("#description_counter"), this.description_limit);
		}
	},
	gray_out:function(grayout){
		if(grayout){
			this.$el.find(".disable-on-edit").addClass("gray-out");
			this.$el.find(".upload_input").addClass("gray-out");
			this.$el.find("#input_title").val(" ");
			this.$el.find("#input_description").val(" ");
			this.$el.find(".gray-out").prop("disabled", true);
		}else{
			this.$el.find(".tag_input").removeClass("gray-out");
			this.$el.find(".upload_input").removeClass("gray-out");
			this.$el.find(".upload_input").prop("disabled", false);
			this.$el.find(".tag_input").prop("disabled", false);
		}

	},
	add_tag: function(event){
		if((!event || (!event.keyCode || event.keyCode ==13)) && this.$el.find("#tag_box").val().trim() != ""){
			var tag = this.$el.find("#tag_box").val().trim();
            var selector=tag.replace(" ","__");
            if(this.$("#tag_area").find("#" + selector).length == 0){
                this.append_tags([tag]);
                if(this.multiple_selected){
                    var list = this.$el.find('#uploaded_list input:checked').parent("li");
                    for(var i = 0; i < list.length; i++){
                        $(list[i]).data("data").add_tag(tag);
                    }
                }else{
                    this.current_view.add_tag(tag);
                }
            }
            this.$el.find("#tag_box").val("");
		}
	},
	remove_tag:function(event){
		var tagname = event.target.parentNode.id.replace("__", " ");
		console.log("tag is now: ",tagname);
		if(this.multiple_selected){
			var list = this.$el.find('#uploaded_list input:checked').parent("li");
			for(var i = 0; i < list.length; i++){
				$(list[i]).data("data").remove_tag(tagname);
			}
		}else{
			this.current_view.remove_tag(tagname);
		}
		event.target.parentNode.remove();
	},
	set_edited:function(event){
		this.$el.find(".disable_on_error").prop("disabled", false);
		this.$el.find("#input_title").removeClass("error_input");
		this.$el.find("#title_error").html("");

		this.set_node_edited();
	},
	handle_error:function(view){
		this.$el.find(".disable_on_error").prop("disabled", true);
		this.set_current(view);
		this.$el.find("#input_title").addClass("error_input");
		this.$el.find("#title_error").html(view.model.validationError);
		view.$el.css("background-color", "#F6CECE");
		this.switchPanel(true);
	},
	load_preview:function(){
		this.preview_view.switch_preview(this.current_node);
	},
	switchPanel:function(switch_to_details){
		$((switch_to_details)? "#metadata_details_btn" : "#metadata_preview_btn").addClass("btn-tab-active");
		$((switch_to_details)? "#metadata_preview_btn" : "#metadata_details_btn").removeClass("btn-tab-active");
		$("#metadata_edit_details").css("display", (switch_to_details)? "block" : "none");
		$("#metadata_preview").css("display", (switch_to_details)? "none" : "block");
	},
	append_tags:function(tags){
		for(var i = 0; i < tags.length; i++){
            var selector=tags[i].replace(" ","__");
            this.$el.find("#tag_area").append("<div class='col-xs-4 tag' id='" + selector+ "'>" + tags[i] + " <span class='glyphicon glyphicon-remove pull-right delete_tag' aria-hidden='true'></span></div>");
		}
	}
});

var ContentItem =  BaseViews.BaseListNodeItemView.extend({
    license:function(){
        return window.licenses.get_default().id;
    },
    /* TODO: Implement once other types of content are implemented */
    remove_item: function(){
        this.containing_list_view.collection.remove(this.model);
        this.delete(false);
    },
    submit_item:function(){
        this.containing_list_view.collection.add(this.model);
    },
    delete_item: function(){
        this.delete(true);
    }
});

var NodeListItem = ContentItem.extend({
    template: require("./hbtemplates/content_list_item.handlebars"),
    tagName: "li",
    'id': function() {
        return this.model.cid;
    },
    initialize: function(options) {
        _.bindAll(this, 'submit_topic','remove_topic');
        this.containing_list_view = options.containing_list_view;
        this.file_data = options.file_data;
        this.render();
    },
    render: function() {
        this.$el.html(this.template({
            topic: this.model,
            edit: this.edit,
        }));
        this.$el.find(".topic_textbox").focus();
    },
    events: {
        'keyup .content_name' : 'submit_topic',
        'click .remove_topic' : 'remove_topic'
    },
    remove_topic: function(){
        this.remove_item();
        this.delete_view();
    },
    submit_topic : function(event){
        this.model.set({
            title: this.$el.find("input").val()
        });
        this.submit_item();
        if(!event.keyCode || event.keyCode ==13){
            this.render();
        }
    }
});

var UploadedItem = ContentItem.extend({
	template: require("./hbtemplates/uploaded_list_item.handlebars"),
	initialize: function(options) {
		_.bindAll(this, 'remove_topic');
		this.containing_list_view = options.containing_list_view;
		this.edited = false;
		this.checked = false;
		this.file_data = options.file_data;
		this.originalData = {
			"title":this.model.get("title"),
			"description":this.model.get("description")
		};
		this.render();
		this.load_tags();
	},
	render: function() {
		this.$el.html(this.template({
			topic: this.model,
			id: this.model.cid
		}));
		this.$el.find("input[type=checkbox]").prop("checked", this.checked);
		this.set_edited(this.edited);
		this.$el.data("data", this);
	},
	events: {
		'click .remove_topic' : 'remove_topic'
	},
	load_tags:function(){
		this.tags = [];
        var self = this;
        if(this.model.get("tags")){
            this.model.get("tags").forEach(function(entry){
                self.tags.push((entry.tag_name) ? entry.tag_name : entry);
            });
        }
	},
	remove_topic: function(){
		this.delete_item();
	},
	set_edited:function(edited){
		this.edited = edited;
		if(edited){
			this.set_node();
            this.containing_list_view.enqueue(this);
		}
		$("#item_" + this.model.cid + " .item_name").html(this.model.get("title") + ((edited) ? " <b>*</b>" : ""));
	},
	set_node:function(){
        if(!this.containing_list_view.multiple_selected){
            this.set({
                title: $("#input_title").val().trim(),
                description: $("#input_description").val().trim()
            });
        }
	},
	unset_node:function(){
		this.save(this.originalData, {async:false, validate:false});
	},
	add_tag:function(tagname){
        if(this.tags.indexOf(tagname) < 0){
            this.tags.push(tagname);
        }
        this.set_edited(true);
	},
	remove_tag:function(tagname){
        this.tags.splice(this.tags.indexOf(tagname), 1);
        this.set_edited(true);
	}
});

var PreviewView = UploadItemView.extend({
    template: require("./hbtemplates/preview_dialog.handlebars"),
    modal_template: require("./hbtemplates/preview_modal.handlebars"),
    initialize: function(options) {
        this.modal = options.modal;
        this.render();
    },
    render: function() {
        if(this.modal){
            this.$el.html(this.modal_template());
            this.$(".modal-body").html(this.template({}));
            this.$el.append(this.el);
            this.$(".modal").modal({show: true});
            this.$el.find(".modal").on("hide.bs.modal", this.close);
        }else{
            this.$el.html(this.template({
                node: this.model
            }));
        }
        this.load_preview();
    },

    load_preview:function(){
        var location = "/media/";
        var extension = "";
        if(this.model){
            // TODO-BLOCKER: this whole if-else needs to be burned to the ground, once we fix the API
            if(this.model.attributes.file_data){
                console.log("PREVIEWING...", this.model);
                location += this.model.attributes.file_data.filename.substring(0,1) + "/";
                location += this.model.attributes.file_data.filename.substring(1,2) + "/";
                location += this.model.attributes.file_data.filename;
                extension = this.model.attributes.file_data.filename.split(".")[1];
            }else{
                var previewed_file = this.model.get_files().models[0];
                console.log("GOT FILE:", previewed_file);
                if(previewed_file){
                    extension = previewed_file.get("extension").replace(".", "");
                    location += previewed_file.get("content_copy").split("/").slice(-3).join("/");
                }
            }
            var preview_template;
            switch (this.model.get("kind")){
                case "image":
                    preview_template = require("./hbtemplates/preview_templates/image.handlebars");
                    break;
                case "pdf":
                case "text":
                    preview_template = require("./hbtemplates/preview_templates/pdf.handlebars");
                    break;
                case "audio":
                    preview_template = require("./hbtemplates/preview_templates/audio.handlebars");
                    break;
                case "video":
                    preview_template = require("./hbtemplates/preview_templates/video.handlebars");
                    break;
                default:
                    preview_template = require("./hbtemplates/preview_templates/default.handlebars");
            }

            var options = {
                source: location,
                extension:extension,
                title: this.model.get("title")
            };
            this.$el.find("#preview_window").html(preview_template(options));
        }

    },

    switch_preview:function(model){
        this.model = model;
        this.load_preview();
    }
});


module.exports = {
    AddContentView: AddContentView,
    EditMetadataView:EditMetadataView,
    FileUploadView:FileUploadView,
    PreviewView:PreviewView
}