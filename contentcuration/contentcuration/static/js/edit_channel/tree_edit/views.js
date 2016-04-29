var Backbone = require("backbone");
var _ = require("underscore");
require("content-container.less");
var BaseViews = require("./../views");
//var PreviewerViews = require("edit_channel/previewer/views");
var QueueView = require("edit_channel/queue/views");
var DragHelper = require("edit_channel/utils/drag_drop");
var UploaderViews = require("edit_channel/uploader/views");
//var UndoManager = require("backbone-undo");
var Models = require("./../models");

/* Main view for all draft tree editing */
var TreeEditView = BaseViews.BaseView.extend({
	container_index: 0,
	containers:[],
	template: require("./hbtemplates/container_area.handlebars"),
	initialize: function(options) {
		_.bindAll(this, 'copy_content','delete_content' , 'add_container', 'edit_content', 'toggle_details', 'back_to_edit'/*,'undo_action', 'redo_action'*/);
		this.is_edit_page = options.edit;
		this.collection = options.collection;
		this.is_clipboard = options.is_clipboard;

		var self=this;
		this.display_load("Loading Content...", function(){
			self.render();
			self.queue_view = new QueueView.Queue({
		 		el: $("#queue-area"),
		 		collection: self.collection
		 	});
		 	$("#queue-area").css("display", (self.is_clipboard || !self.is_edit_page)? "none" : "block");
		 	$("#main-nav-home-button").removeClass("active");

		 	if(self.is_edit_page){
				$("#channel-edit-button").addClass("active");
		 	}else if(!self.is_clipboard){
		 		$("#channel-preview-button").addClass("active");
		 	}

		 	options.channels.forEach(function (entry){
				$("#channel_selection_dropdown_list").append("<li><a href='/channels/" + entry.id + "/edit' class='truncate'>" + entry.get("name") + "</a></li>");
			});
			$("#channel_selection_dropdown").html(window.current_channel.get("name") + "<span class='caret'></span>");
		});
	 	/*
	 	this.undo_manager = new UndoManager({
            track: true,
            register: [this.collection]
        });*/
	},
	render: function() {
		this.$el.html(this.template({
			edit: this.is_edit_page,
			channel : window.current_channel,
			is_clipboard : this.is_clipboard
		}));
		this.add_container(this.containers.length, this.model);
	},
	events: {
		'click .copy_button' : 'copy_content',
		'click .delete_button' : 'delete_content',
		'click .edit_button' : 'edit_content',
		'click #hide_details_checkbox' :'toggle_details',
		'click .back_to_edit_button' : 'back_to_edit'
	},
	back_to_edit:function(){
		window.location = window.location.href.replace("clipboard", "edit");
	},
	remove_containers_from:function(index){
		while(this.containers.length > index){
			this.containers[this.containers.length-1].delete_view();
			this.containers.splice(this.containers.length-1);
		}
		this.containers[this.containers.length-1].close_folders();
	},
	add_container: function(index, topic){
		/* Close directories of children and siblings of opened topic*/
		if(index < this.containers.length){
			this.remove_containers_from(index);
		}
		/* Create place for opened topic */
		this.$el.find("#container_area").append("<li id='container_" + topic.id + "' class='container content-container "
						+ "' name='" + (this.containers.length + 1) + "'></li>");
		var container_view = new ContentList({
			el: this.$el.find("#container_area #container_" + topic.id),
			model: topic,
			index: this.containers.length + 1,
			edit_mode: this.is_edit_page,
			collection: this.collection,
			container : this
		});
		this.containers.push(container_view);
	},

	delete_content: function (event){
		if(confirm("Are you sure you want to delete these selected items?")){
			var self = this;
			for(var i = 0; i < this.containers.length; i++){
				if(this.containers[i].delete_selected()){
					this.remove_containers_from(this.containers[i].index);
					break;
				}
			}
		}
	},
	copy_content: function(event){
		var self = this;
		this.display_load("Copying Content...", function(){
			for(var i = 0; i < self.containers.length; i++){
				if(self.containers[i].copy_selected()){
					break;
				}
			}
		});
	},
	edit_content: function(event){
		this.edit_selected();
	},
	toggle_details:function(event){
		/*TODO: Debug more with editing and opening folders*/
		this.$el.find("#container_area").toggleClass("hidden_details");
	},
	add_to_trash:function(views){
		this.queue_view.add_to_trash(views);
		views.forEach(function(entry){
			entry.delete_view();
		});
	},
	add_to_clipboard:function(views){
		console.log("clipboard views", views);
		this.queue_view.add_to_clipboard(views);
	}
});

/* Open directory view */
var ContentList = BaseViews.BaseListView.extend({
	item_view: "node",
	template: require("./hbtemplates/content_container.handlebars"),
	current_node : null,
	initialize: function(options) {
		_.bindAll(this, 'add_content');
		this.index = options.index;
		this.lock = true;
		this.edit_mode = options.edit_mode;
		this.container = options.container;
		this.collection = options.collection;
		this.childrenCollection = this.collection.get_all_fetch(this.model.get("children"));
		this.childrenCollection.sort_by_order();
		this.render();

		/* Animate sliding in from left */
		this.$el.css('margin-left', -this.$el.find(".content-list").outerWidth());
		$("#container_area").width(this.$el.find(".content-list").outerWidth() * (this.index));
		this.$el.animate({'margin-left' : "0px"}, 500);
	},
	render: function() {
		DragHelper.removeDragDrop(this);
		this.childrenCollection = this.collection.get_all_fetch(this.model.get("children"));
		this.childrenCollection.sort_by_order();
		this.$el.html(this.template({
			topic: this.model,
			title: (this.model.parent)? this.model.get("title") : window.current_channel.get("name"),
			edit_mode: this.edit_mode,
			index: this.index,
			content_list: this.childrenCollection.toJSON()
		}));
		this.load_content();
		this.$el.data("container", this);
		this.$el.find("ul").data("list", this);
		this.$el.find(".default-item").data("data", {
			containing_list_view: this,
			index:0
		});
		DragHelper.addDragDrop(this);
	},

	events: {
		'click .add_content_button':'add_content',
		'click .back_button' :'close_container'
	},

	load_content : function(){
    	var start = new Date().getTime();
		this.views = [];
		var self = this;
		var el = this.$el.find(".content-list");
		this.list_index = 0;
		this.childrenCollection.forEach(function(entry){
			var file_view = new ContentItem({
				el: el.find("#" + entry.id),
				model: entry,
				edit_mode: self.edit_mode,
				containing_list_view:self,
				allow_edit: false,
				index : self.list_index++
			});
			if(self.current_node && entry.id == self.current_node)
				file_view.set_opened(true, false);
			self.views.push(file_view);
		});
	},
	add_content: function(event){
		this.add_to_view();
	},

	add_container:function(view){
		this.current_node = view.model.id;
		this.container.add_container(this.index, view.model);
	},

	/* Resets folders to initial state */
	close_folders:function(){
		this.views.forEach(function(entry){
			entry.set_opened(false);
		});
	},
	add_to_trash:function(views){
		this.container.add_to_trash(views);
	},
	add_to_clipboard:function(views){
		this.container.add_to_clipboard(views);
	},
	close_container:function(views){
		var self = this;
		this.$el.animate({'margin-left' : -this.$el.outerWidth()}, 100,function(){
			self.container.remove_containers_from(self.index - 1);
		});
	}
});


/*folders, files, exercises listed*/
var ContentItem = BaseViews.BaseListNodeItemView.extend({
	template: require("./hbtemplates/content_list_item.handlebars"),
	initialize: function(options) {
		_.bindAll(this, 'edit_folder','open_folder',/*'expand_or_collapse_folder', */
					'submit_edit', 'cancel_edit','preview_node', 'cancel_open_folder');
		this.edit_mode = options.edit_mode;
		this.allow_edit = options.allow_edit;
		this.containing_list_view = options.containing_list_view;
		this.index = options.index;
		this.files = (this.model.get("title").trim() == "topic")?  null : this.model.get_files();
		this.render();

		console.log(this.model.get("title") + " parent is " + this.model.get("parent") + " and has index " + this.index);
	},

	render:function(){
		this.$el.html(this.template({
			node: this.model,
			isfolder: this.model.get("kind").toLowerCase() == "topic",
			edit_mode: this.edit_mode,
			allow_edit: this.allow_edit,
			resource_count : this.model.get("resource_count")
		}));
		this.$el.data("data", this);
		if($("#hide_details_checkbox").attr("checked"))
			this.$el.find("label").addClass("hidden_details");
	},
	events: {
		'click .edit_folder_button': 'edit_folder',
		'click .node_title_textbox': 'cancel_open_folder',
		'click .topic_textarea' : 'cancel_open_folder',
		'click .open_folder':'open_folder',
		'click .folder' : "open_folder",
		'click .cancel_edit' : 'cancel_edit',
		'click .submit_edit' : 'submit_edit',
		'click .preview_button': 'preview_node',
		'click .file' : 'preview_node'
	},
	open_folder:function(event){
		event.preventDefault();
		event.stopPropagation();
		this.containing_list_view.close_folders();
		this.containing_list_view.add_container(this);
		this.set_opened(true);
	},
	cancel_open_folder:function(event){
		event.preventDefault();
		event.stopPropagation();
	},
	set_opened:function(is_opened){
		if(is_opened){
			this.$el.addClass("current_topic");
			this.$el.attr("draggable", "false");
		}else{
			this.$el.attr("draggable", "true");
			this.$el.removeClass("current_topic");
		}
	},
	edit_folder: function(event){
		event.preventDefault();
		event.stopPropagation();
		this.allow_edit = this.edit_mode;
		this.render();
		this.$el.addClass("editing");
	},
	submit_edit: function(event){
		event.preventDefault();
		event.stopPropagation();
		var title = ($("#textbox_" + this.model.id).val().trim() == "")? "Untitled" : $("#textbox_" + this.model.id).val().trim();
		var description = ($("#textarea_" + this.model.id).val().trim() == "")? " " : $("#textarea_" + this.model.id).val().trim();
		this.model.set({title:title, description:description}, {validate:true});
		if(this.model.validationError){
			this.$el.find(".node_title_textbox").addClass("error_input");
			this.$el.find(".error_msg").html(this.model.validationError);
		}
		else{
			this.save();
			this.allow_edit = false;
			this.$el.removeClass("editing");
			this.render();
		}

	},
	cancel_edit: function(event){
		event.preventDefault();
		event.stopPropagation();
		this.allow_edit = false;
		this.render();
		if($("#hide_details_checkbox").attr("checked")){
			this.$el.find("label").removeClass("editing");
			this.$el.find("label").addClass("hidden_details");
		}
	},
	preview_node: function(event){
		event.preventDefault();
		$("#main-content-area").append("<div id='dialog'></div>");
		if(this.edit_mode){
			var metadata_view = new UploaderViews.EditMetadataView({
				el : $("#dialog"),
				model: this.model,
				allow_add: false,
				main_collection : this.main_collection,
				modal: true,
				parent_view : this
			});
		}else{
			var preview_view = new UploaderViews.PreviewView({
				modal:true,
				model: this.model,
				el : $("#dialog")
			});
		}


	},
	publish:function(){
		var self = this;
		this.display_load("Publishing Content...", function(){
			self.save({"published": true},{validate:false});
			self.publish_children(self.model, self.containing_list_view.collection);
			self.render();
		});

	},
	publish_children:function(model, collection){
		var self = this;
		if(model.attributes){
			var children = collection.get_all_fetch(model.get("children"));
			children.forEach(function(entry){
				if(!entry.get("published")){
					entry.save({"published":true},{validate:false});
				}
				self.publish_children(this, collection);
			});
		}
	},
	add_to_trash:function(){
		this.containing_list_view.add_to_trash([this]);
		this.delete_view();
	}
});

module.exports = {
	TreeEditView: TreeEditView
}