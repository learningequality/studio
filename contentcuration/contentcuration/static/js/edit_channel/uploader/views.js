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
		_.bindAll(this, 'add_topic', 'edit_metadata','add_file','close', 'add_exercise', 'import_content');
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
		'click #create_exercise' : 'add_exercise',
        'click #import_node' : 'import_content'
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
        $(".modal-backdrop").remove();  //TODO: Might need to change this later, but remove any remaining modals
        this.delete_view();
    },
    import_content:function(){
        var import_view = new ImportView({
            modal: true,
            parent_view: this
        });
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


var ImportView = UploadItemView.extend({
    template: require("./hbtemplates/import_dialog.handlebars"),
    modal_template: require("./hbtemplates/import_modal.handlebars"),
 //   file_upload_template : require("./hbtemplates/file_upload_item.handlebars"),

    initialize: function(options) {
        _.bindAll(this, 'import_content');
        this.modal = options.modal;
        this.parent_view = options.parent_view;
        this.other_channels = window.channels.clone();
        this.other_channels.remove(window.current_channel);
        this.mainCollection = new Models.NodeCollection();
        this.render();
    },
    events: {
      "click #import_content_submit" : "import_content"
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

        var channel_collection = new Models.NodeCollection();
        this.other_channels.forEach(function(channel){
            var node = channel.get_tree("draft").get_root();
            node.set({title:channel.get("name")});
            channel_collection.add(node);
        });

        var importList = new ImportList({
            parent_view: this,
            model : null,
            mainCollection: this.mainCollection,
            indent:20,
            index:0,
            el:$("#import_from_channel_box"),
            is_channel: true,
            collection :  channel_collection,
            selected:false,
            parent_topic:null
        });
    },
    update_file_count:function(){
        var checked_items = this.$el.find("#import_from_channel_box>ul:first-child>li>.import_checkbox:checked");
        var file_count = 0;
        var file_size = 0;
        for(var i = 0; i < checked_items.length; i++){
            var view = $(checked_items[i]).parent("li").data("data");
            file_count += view.selected_count;
            file_size += view.selected_size;
        }

        if(file_count == 0){
            this.$el.find("#import_file_count").html("<em>No files selected</em>");
            $("#import_content_submit").prop("disabled", true);
        }else{
            $("#import_content_submit").prop("disabled", false);
            var string_file_size;
            switch(true){
                case (file_size > 999999999):
                    string_file_size = parseInt(file_size/1000000000) + "GB";
                    break;
                case (file_size > 999999):
                    string_file_size = parseInt(file_size/1000000) + "MB";
                    break;
                case (file_size > 999):
                    string_file_size = parseInt(file_size/1000) + "KB";
                    break;
                default:
                    string_file_size = parseInt(file_size) + "B";
            }
            this.$el.find("#import_file_count").html(file_count + " file" + ((file_count == 1)? "   " : "s   ") + string_file_size);
        }
    },
    import_content:function(){
        var self = this;
        this.display_load("Importing Content...", function(){
            var checked_items = self.$el.find("#import_from_channel_box .import_checkbox:checked");
            var copyCollection = new Models.NodeCollection();
            for(var i = 0; i < checked_items.length; i++){
                var view = $(checked_items[i]).parent("li").data("data");
                if(view.model && view.model.get("kind") != "topic"){
                    copyCollection.add(view.model);
                }else if(view.model && !view.subfile_view){
                    self.import_children(view.model.get("children"), copyCollection);
                }
            }
            self.parent_view.collection.add(copyCollection.duplicate(null, {async:false}).models);
            console.log("collection is now:",self.parent_view.collection);

            self.parent_view.render();
            self.close();
        });
    },
    import_children:function(children, copyCollection){
        var childrenCollection = this.mainCollection.get_all_fetch(children);
        var self = this;
        childrenCollection.forEach(function(node){
            if(node.get("kind") === "topic"){
                self.import_children(node.get("children"), copyCollection);
            }else{
                copyCollection.add(node);
            }
        });
    }
});

var ImportList = BaseViews.BaseListView.extend({
    template: require("./hbtemplates/import_list.handlebars"),
    initialize: function(options) {
        this.mainCollection = options.mainCollection;
        this.indent = options.indent;
        this.index = options.index;
        this.parent_view = options.parent_view;
        this.is_channel = options.is_channel;
        this.collection = options.collection;
        this.selected = options.selected;
        this.parent_topic = options.parent_topic;
        this.render();
    },
    render: function() {
        this.views = [];
        this.$el.html(this.template({
            index : this.index,
            is_empty : this.collection.length == 0,
            is_channel:this.is_channel
        }));

        var self = this;
        this.list_index = 0;
        this.collection.forEach(function(entry){
            var item_view = new ImportItem({
                containing_list_view: self,
                model: entry,
                indent : self.indent,
                index : self.list_index ++,
                is_channel : self.is_channel,
                mainCollection : self.mainCollection,
                selected:self.selected,
                parent_topic:self.parent_topic
            });
            self.$el.find("#import_list_" + self.index).append(item_view.el);
            if(entry.get("kind")=="topic"){
                item_view.check_topic();
            }
            self.views.push(item_view);
        });
    },
    handle_checked_item:function(){
        if(this.parent_topic){
            this.parent_topic.check_topic();
        }else{
            this.parent_view.update_file_count();
        }
    }
});

var ImportItem = BaseViews.BaseListNodeItemView.extend({
    template: require("./hbtemplates/import_list_item.handlebars"),
    tagName: "li",
    className: "import_list_item",
    indent: 0,
    'id': function() {
        return "import_item_" + this.model.get("id");
    },

    initialize: function(options) {
        _.bindAll(this, 'toggle', 'check_item');
        this.containing_list_view = options.containing_list_view;
        this.indent = options.indent;
        this.index = options.index;
        this.is_channel = options.is_channel;
        this.collection = new Models.NodeCollection();
        this.mainCollection = options.mainCollection;
        this.selected = options.selected;
        this.selected_count = 0;
        this.selected_size = 0;
        this.render();
    },
    events: {
        'click .tog_folder' : 'toggle',
        'click >.import_checkbox' : 'check_item'
    },
    render: function() {
        this.$el.html(this.template({
            node:this.model,
            isfolder: this.model.get("kind").toLowerCase() == "topic",
            sub_list: this.model.get("children"),
            indent: this.indent,
            index: this.index,
            is_channel:this.is_channel
        }));
        this.$el.data("data", this);
        this.$el.find(".import_checkbox").first().prop("checked", this.selected);
    },
    check_item:function(){
        this.selected =  this.$el.find(".import_checkbox").first().is(":checked");

        if(this.model.get("kind") != "topic"){
            this.selected_count = (this.selected)? 1:0;
            this.selected_size = (this.selected)? this.model.get("resource_size") : 0;
            this.containing_list_view.handle_checked_item();
        }
        else{
            var subfiles = this.$el.find("#" + this.id() +"_sub .import_checkbox");
            for(var f = 0; f < subfiles.length; f++){
                $(subfiles[f]).prop("checked", this.selected);
                $(subfiles[f]).parent("li").data("data").check_item();
            }
            this.check_topic();
        }
    },
    toggle:function(){
        event.stopPropagation();
        event.preventDefault();
        this.load_subfiles();
        var el =  this.$el.find("#menu_toggle_" + this.model.id);
        var collapsed_symbol = (this.is_channel)? "glyphicon-menu-right" : "glyphicon-triangle-top";
        var expanded_symbol = (this.is_channel)? "glyphicon-menu-down" : "glyphicon-triangle-bottom";

        if(el.hasClass(collapsed_symbol)){
            this.$el.find("#" + this.id() +"_sub").slideDown();
            el.removeClass(collapsed_symbol).addClass(expanded_symbol);
        }else{
            this.$el.find("#" + this.id() +"_sub").slideUp();
            el.removeClass(expanded_symbol).addClass(collapsed_symbol);
        }
    },
    check_topic:function(){
        var checked_items = this.$el.find("#" + this.id() +"_sub>ul:first-child>li>.import_checkbox:checked");
        this.selected = (!this.subfile_view && this.selected) || checked_items.length > 0;
        this.$el.find(".import_checkbox").first().prop("checked", this.selected);

        this.selected_count = 0;
        this.selected_size = 0;

        if(!this.subfile_view && this.selected){
            this.selected_count = this.model.get("file_count");
            this.selected_size = this.model.get("resource_size");
            console.log("before render, count is", this.selected_count);
        }else{
            for(var i = 0; i < checked_items.length; i++){
                this.selected_count += $(checked_items[i]).parent("li").data("data").selected_count;
                this.selected_size +=  $(checked_items[i]).parent("li").data("data").selected_size;
            }
        }

        this.$el.find(".badge").first().css("visibility", (this.selected)? "visible":"hidden");
        this.$el.find(".badge").first().html(this.selected_count);

        this.containing_list_view.handle_checked_item();
    },
    load_subfiles:function(){
        if(this.collection.length == 0){
             this.collection = this.mainCollection.get_all_fetch(this.model.get("children"));
             this.collection.sort_by_order();
             this.subfile_view = new ImportList({
                model : this.model,
                indent: this.indent + 20,
                el: $("#" + this.id() + "_sub"),
                mainCollection: this.containing_list_view.mainCollection,
                parent_view: this.containing_list_view.parent_view,
                index: this.index + 1,
                is_channel: false,
                collection: this.collection,
                selected: this.selected,
                parent_topic : this
            });
        }
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

	initialize: function(options) {
		console.log("called this");
		_.bindAll(this, 'close_uploader', "save_and_keep_open", 'check_item',
						'add_tag','save_and_finish','add_more','set_edited',
						'render_details', 'render_preview', 'remove_tag');
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
				allow_add: this.allow_add
			}));
	        $("body").append(this.el);
	        this.$(".modal").modal({show: true, backdrop: 'static', keyboard: false});
        	this.$(".modal").on("hide.bs.modal", this.close_uploader);
		}else{
			this.$el.html(this.template({
				node_list: this.collection.toJSON(),
				multiple_selected: this.collection.length > 1 || this.allow_add,
				allow_add: this.allow_add
			}));
		}
		this.preview_view = new PreviewView({
			modal:false,
			el: $("#metadata_preview"),
			model:this.current_node
		});

		this.gray_out();
		this.load_content();
	},
	events: {
		'click .close_uploader' : 'close_uploader',
		'click #upload_save_button' : 'save_and_keep_open',
		'click #upload_save_finish_button' : 'save_and_finish',
		'click #add_more_button' : 'add_more',
		'click #uploader' : 'finish_editing',
		'click :checkbox' : 'check_item',
		'keypress #tag_box' : 'add_tag',
		'keyup .upload_input' : 'set_edited',
		'click #metadata_details_btn' : 'render_details',
		'click #metadata_preview_btn' : 'render_preview',
		'click .delete_tag':'remove_tag'
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
		console.log("UPLOADING PERFORMANCE uploader/views.js: starting check_nodes...");
		var start = new Date().getTime();
		this.$el.find("#validating_text").css("display", "inline");
		this.$el.find(".editmetadata_save").prop("disabled", true);
		this.$el.find(".editmetadata_save").css("pointer", "not-allowed");

		var self = this;
		setTimeout(function() {
           /* TODO :fix to save multiple nodes at a time */
			self.$el.find(".upload_input").removeClass("gray-out");
			self.parent_view.set_editing(false);
			self.errorsFound = false;
			self.$el.find("#description_error").html("");
			self.$el.find("#input_description").removeClass("error_input");

			self.check_nodes();
			self.$el.find(".editmetadata_save").prop("disabled", false);
			self.$el.find("#validating_text").css("display", "none");
			self.$el.find(".editmetadata_save").css("pointer", "cursor");

			if(!self.errorsFound){
				self.$el.css("visibility", "hidden");
				self.display_load("Saving Content...", function(){
					self.save_nodes();
					if(!self.errorsFound){
						$(".uploaded").css("background-color", "white");
						self.$el.find("#title_error").html("");
						self.$el.find("#description_error").html("");
						if(self.disable){
							self.gray_out();
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
	save_and_finish: function(){
		var self = this;
		this.check_and_save_nodes(function(){
			if(self.modal){
				self.$el.find(".modal").modal("hide");
			}else{
				self.close_uploader();
			}
		});

	},
	add_more:function(event){
		this.save_queued();
		if(this.modal){
			this.$el.find(".modal").modal("hide");
		}else{
	        this.close_uploader();
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
		if(!this.current_view && !this.disable){
			this.set_current(view);
		}else {
			if(!this.disable){
				/* Previous node passes all tests */
				this.$el.find("#title_error").html("");
				this.$el.find("#description_error").html("");
				this.set_current(view);
			}
		}
	},
	set_current:function(view){
		if(this.collection.length <= 1 && !this.allow_add){
			this.current_node = this.model;
			this.current_view = view;
		}else{
			this.current_node = this.collection.get({cid: view.model.cid});
			if(this.current_view)
				this.current_view.$el.css("background-color", "transparent");
			this.current_view = view;
			this.current_view.$el.css("background-color", "#E6E6E6");
		}
		this.load_preview();
		this.$el.find("#input_title").val(this.current_node.get("title"));
		this.$el.find("#input_description").val(this.current_node.get("description"));
		if(this.current_node.get("original_filename")){
			this.$el.find("#original_filename_area").css("display", "block");
			this.$el.find("#original_filename").html( this.current_node.get("original_filename"));
		}else{
			this.$el.find("#original_filename_area").css("display", "none");
		}

        // Allows us to read either a node with nested metadata from the server, or an instantiated but unsaved node on the client side.
        var file_size = (((this.current_node.get("formats") || [])[0] || {}).format_size) || ((this.current_node.get("file_data") || {}).data || {}).size || "";
        this.$("#display_file_size").text(file_size);
        this.$el.find(".upload_input").removeClass("gray-out");
	},
	check_item: function(){
		this.disable = this.$el.find("#uploaded_list :checked").length > 1;
		this.parent_view.set_editing(this.disable);
		this.$el.find("#input_title").val((this.disable || !this.current_node)? " " : this.current_node.get("title"));
		this.$el.find("#input_description").val((this.disable || !this.current_node)? " " : this.current_node.get("description"));

		if(this.disable) {
			this.gray_out();
			//TODO: Clear tagging area $("#tag_area").html("");
		}
		else {
			this.$el.find(".upload_input").removeClass("gray-out");
			this.set_current_node(this.$el.find("#uploaded_list :checked").parent("li").data("data"));
		}
	},
	gray_out:function(){
		this.$el.find(".disable-on-edit").addClass("gray-out");
		this.$el.find(".upload_input").addClass("gray-out");
		this.$el.find("#input_title").val(" ");
		this.$el.find("#input_description").val(" ");
	},
	add_tag: function(event){
		if((!event.keyCode || event.keyCode ==13) && this.$el.find("#tag_box").val().trim() != ""){
			/* TODO: FIX THIS LATER TO APPEND TAG VIEWS TO AREA*/
			this.$el.find("#tag_area").append("<div class='col-xs-4 tag'>" + this.$el.find("#tag_box").val().trim() + " <span class='glyphicon glyphicon-remove pull-right delete_tag' aria-hidden='true'></span></div>");
			this.$el.find("#tag_box").val("");
		}
	},
	remove_tag:function(event){
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
	tags: [],
	template: require("./hbtemplates/uploaded_list_item.handlebars"),
	initialize: function(options) {
		_.bindAll(this, 'remove_topic','set_current_node','set_checked');
		this.containing_list_view = options.containing_list_view;
		this.edited = false;
		this.checked = false;
		this.file_data = options.file_data;
		this.originalData = {
			"title":this.model.get("title"),
			"description":this.model.get("description")
		};
		this.render();
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
		'click .remove_topic' : 'remove_topic',
		'click label' : 'set_current_node',
		'click :checkbox' : 'set_checked'
	},
	remove_topic: function(){
		this.delete_item();
	},
	set_edited:function(edited){
		this.edited = edited;
		if(edited){
			this.set_node();
		}
        if(this.containing_list_view.multiple_selected){

        }else{
            $("#item_" + this.model.cid + " .item_name").html(this.model.get("title") + ((edited) ? " <b>*</b>" : ""));
        }

	},

	set_current_node:function(event){
		if(event) event.preventDefault();
		this.containing_list_view.set_current_node(this);
	},

	set_node:function(){
		this.set({
			title: $("#input_title").val().trim(),
			description: $("#input_description").val().trim(),
			license: this.license()
		});
	},
	unset_node:function(){
		this.save(this.originalData, {async:false, validate:false});
	},

	set_checked:function(){
		this.checked = this.$el.find("input[type=checkbox]").prop("checked");
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