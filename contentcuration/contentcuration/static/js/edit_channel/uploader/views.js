var Backbone = require("backbone");
var _ = require("underscore");
require("uploader.less");
var BaseViews = require("edit_channel/views");
var Models = require("edit_channel/models");
var Dropzone = require("dropzone");
require("uploader.less");
require("dropzone/dist/dropzone.css");
var get_cookie = require("utils/get_cookie");


var AddContentView = BaseViews.BaseListView.extend({
	template: require("./hbtemplates/add_content_dialog.handlebars"),
	header_template: require("./hbtemplates/add_content_header.handlebars"),
	modal_template: require("./hbtemplates/uploader_modal.handlebars"),
	next_header_template: require("./hbtemplates/edit_metadata_header.handlebars"),
	item_view:"uploading_content",
	counter:0,
	initialize: function(options) {
		_.bindAll(this, 'add_topic', 'edit_metadata','add_file','close');	
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
		'click #upload_file' : 'add_file'
	},

	/*Render any items that have previously been added*/
	load_content:function(){
		var self = this;
		if(this.collection){
			this.collection.forEach(function(entry){
				var node_view = new NodeListItem({
					edit: false,
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
			"parent" : this.model.id
		});
		this.collection.add(topic);
		this.counter++;
		var item_view = new NodeListItem({
			edit: true,
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
				"created" : file.lastModifiedDate
			});
			self.collection.add(content_node);
			var item_view = new NodeListItem({
				edit: false,
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
	close: function() {
        this.delete_view();
    }
});

var FileUploadView = BaseViews.BaseView.extend({
    template: require("./hbtemplates/file_upload.handlebars"),
    modal_template: require("./hbtemplates/file_upload_modal.handlebars"),
    file_upload_template : require("./hbtemplates/file_upload_item.handlebars"),
    file_list : [],
    acceptedFiles : "image/*,application/pdf,video/*,text/*,audio/*",

    initialize: function(options) {
        _.bindAll(this, "file_uploaded",  "close_file_uploader");
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
            headers: {"X-CSRFToken": get_cookie("csrftoken")}
        });
        this.dropzone.on("success", this.file_uploaded);
        
    },
    file_uploaded: function(file) {
        console.log("FILE FOUND:", file);
        this.file_list.push({
        	"data" : file, 
        	"filename": JSON.parse(file.xhr.response).filename
        });
    },
    close_file_uploader:function(){
      this.callback(this.file_list);
      this.close();
    },
 
    close: function() {
        if (this.modal) {
            this.$(".modal").modal('hide');
        }
        this.remove();
    }
});

var EditMetadataView = BaseViews.BaseEditorView.extend({
	template : require("./hbtemplates/edit_metadata_dialog.handlebars"),
	modal_template: require("./hbtemplates/uploader_modal.handlebars"),
	header_template: require("./hbtemplates/edit_metadata_header.handlebars"),
	initialize: function(options) {
		_.bindAll(this, 'close_uploader');
		console.log("called this");
		_.bindAll(this, 'close_uploader', "check_and_save_nodes", 'check_item',
						'add_tag','save_and_finish','add_more','set_edited',
						'render_details', 'render_preview');	
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
		this.load_content();
	},
	events: {
		'click .close_uploader' : 'close_uploader',
		'click #upload_save_button' : 'check_and_save_nodes',
		'click #upload_save_finish_button' : 'save_and_finish',
		'click #add_more_button' : 'add_more',
		'click #uploader' : 'finish_editing',
		'click :checkbox' : 'check_item',
		'keypress #tag_box' : 'add_tag',
		'keyup .upload_input' : 'set_edited',
		'click #metadata_details_btn' : 'render_details',
		'click #metadata_preview_btn' : 'render_preview'
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
			});
		}
	},
	render_details:function(){
		this.switchPanel(true);
	},
	render_preview:function(){
		this.switchPanel(false);
	},

	check_and_save_nodes: function(){
		console.log("PERFORMANCE uploader/views.js: starting save_nodes...");
    		var start = new Date().getTime();
		/* TODO :fix to save multiple nodes at a time */
		this.$el.find(".upload_input").removeClass("gray-out");
		this.parent_view.set_editing(false);
		var self = this;
		this.errorsFound = false;
		if(!this.disable && this.$el.find("#input_description").val() == "" && this.current_view){
			this.$el.find("#description_error").html("Description is required");
			this.$el.find("#input_description").addClass("error_input");
			this.errorsFound = true;
		}else{
			this.$el.find("#description_error").html("");
			this.$el.find("#input_description").removeClass("error_input");
		}
 		
		this.save_nodes();

		if(!this.errorsFound){
			this.$el.find("#title_error").html("");
			this.$el.find("#description_error").html("");
			if(this.disable){
				this.$el.find(".upload_input").addClass("gray-out");
				this.$el.find("#input_title").val(" ");
				this.$el.find("#input_description").val(" ");
			}
		}

		if(!this.errorsFound && this.allow_add) 
			this.parent_view.add_nodes(this.views, this.main_collection.length);
		console.log("PERFORMANCE tree_edit/views.js: save_nodes end (time = " + (new Date().getTime() - start) + ")");
	},
	save_and_finish: function(){
		this.check_and_save_nodes();
		if(!this.errorsFound){
			if(this.modal){
				this.$el.find(".modal").modal("hide");
			}else{
				this.close_uploader();
			}
		}
	},
	add_more:function(event){
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

		this.views.forEach(function(entry){
			entry.unset_node();
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
			if(!this.disable && this.current_view.validate()){
				/* Previous node passes all tests */
				this.$el.find("#title_error").html("");
				this.$el.find("#description_error").html("");
				this.set_current(view);
			}else{
				/*TODO: disable everything*/
				this.$el.find(".disable_on_error").prop("disabled", true);
				this.$el.find(".disable_on_error").css("cursor", "not-allowed");
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
		
	},
	check_item: function(){
		this.disable = this.$el.find("#uploaded_list :checked").length > 1;
		this.parent_view.set_editing(this.disable);
		this.$el.find("#input_title").val((this.disable || !this.current_node)? " " : this.current_node.get("title"));
		this.$el.find("#input_description").val((this.disable || !this.current_node)? " " : this.current_node.get("description"));

		if(this.disable) {
			this.$el.find(".disable-on-edit").addClass("gray-out");
			//TODO: Clear tagging area $("#tag_area").html("");
		}
		else {
			this.$el.find(".upload_input").removeClass("gray-out");
			this.set_current_node(this.$el.find("#uploaded_list :checked").parent("li").data("data"));
		}
	},
	add_tag: function(event){
		if((!event.keyCode || event.keyCode ==13) && this.$el.find("#tag_box").val().trim() != ""){
			/* TODO: FIX THIS LATER TO APPEND TAG VIEWS TO AREA*/
			this.$el.find("#tag_area").append("<div class='col-xs-4 tag'>" + this.$el.find("#tag_box").val().trim() + "</div>");
			this.$el.find("#tag_box").val("");
		}
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
	}, 
	load_preview:function(){
		console.log("load",this.current_node);
		var location = "";
		var extension = "";
		if(this.current_node.attributes.file_data){
			console.log("PREVIEWING...", this.current_node);
			location = "/media/";
			location += this.current_node.attributes.file_data.filename.substring(0,1) + "/";
			location += this.current_node.attributes.file_data.filename.substring(1,2) + "/";
			location += this.current_node.attributes.file_data.filename;
			extension = this.current_node.attributes.file_data.filename.split(".")[1];
		}else{
			console.log("TESTING...", this.current_node.get_files());
		}
		var preview_template;
		var options = {
			source: location, 
			extension:extension,
			title: this.current_node.get("title")
		};
		switch (this.current_node.get("kind")){
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
		this.$el.find("#preview_window").html(preview_template(options));
	},
	switchPanel:function(switch_to_details){
		$("#metadata_edit_details").css("display", (switch_to_details)? "block" : "none");
		$("#metadata_preview").css("display", (switch_to_details)? "none" : "block");
	}
});

var ContentItem =  BaseViews.BaseListItemView.extend({
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
		_.bindAll(this, 'submit_topic', 'edit_topic','remove_topic');
		this.edit = options.edit;
		this.containing_list_view = options.containing_list_view;
		this.file_data = options.file_data;
		this.render();
	},
	render: function() {
		this.$el.html(this.template({
			topic: this.model,
			edit: this.edit,
			kind: this.model.get("kind").toUpperCase()
		}));
		this.$el.find(".topic_textbox").focus();
	},
	events: {
		'click .submit_topic' : 'submit_topic',
		'keyup .content_name' : 'submit_topic',
		'dblclick .folder_name' : 'edit_topic',
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
			this.edit = false;
			this.render();
		}
	},
	edit_topic: function(){
		this.edit = true;
		//this.remove_item();
		//this.containing_list_view.enqueue(this);
		this.render();
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
			kind: this.model.get("kind").toUpperCase(),
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
		$("#item_" + this.model.cid + " .item_name").html(this.model.get("title") + ((edited) ? " <b>*</b>" : ""));
	},
	
	set_current_node:function(event){
		if(event) event.preventDefault();
		this.containing_list_view.set_current_node(this);
	},
	save_node:function(){
		this.set_edited(false);
		this.save({
			title: $("#input_title").val(), 
			description: $("#input_description").val(),
		}, {async:false});
		this.originalData = {
			"title":$("#input_title").val(), 
			"description":$("#input_description").val()
		};
	},
	set_node:function(){
		this.model.set({
			title: $("#input_title").val().trim(), 
			description: $("#input_description").val().trim(),
		});
	},
	unset_node:function(){
		this.save(this.originalData, {async:false, validate:false});
	},
	validate:function(){
		if(this.containing_list_view.$el.find("#input_title").val() == ""){
			this.containing_list_view.$el.find("#title_error").html("Title is required");
			this.containing_list_view.$el.find("#input_title").addClass("error_input");
			return false;
		}
		if(this.containing_list_view.$el.find("#input_description").val() == ""){
			this.containing_list_view.$el.find("#description_error").html("Description is required");
			this.containing_list_view.$el.find("#input_description").addClass("error_input");
			return false;
		}
		this.model.set(this.model.attributes, {validate:true});
		if(this.model.validationError){
			this.containing_list_view.$el.find("#title_error").html(this.model.validationError);
			this.containing_list_view.$el.find("#input_title").addClass("error_input");
			return false;
		}
		this.containing_list_view.$el.find("#input_title").removeClass("error_input");
		this.containing_list_view.$el.find("#input_description").removeClass("error_input");
		return true;
	},
	set_checked:function(){
		this.checked = this.$el.find("input[type=checkbox]").prop("checked");
	}
});



module.exports = {
	AddContentView: AddContentView,
	EditMetadataView:EditMetadataView,
	FileUploadView:FileUploadView
}