var Backbone = require("backbone");
var _ = require("underscore");
require("content-container.less");
var BaseViews = require("./../views");
var QueueView = require("edit_channel/queue/views");
var UploaderViews = require("edit_channel/uploader/views");
var DragHelper = require("edit_channel/utils/drag_drop");
//var UndoManager = require("backbone-undo");
var Models = require("./../models");

var TreeEditView = BaseViews.BaseView.extend({
	container_index: 0,
	containers:[],
	template: require("./hbtemplates/container_area.handlebars"),
	initialize: function(options) {
		_.bindAll(this, 'copy_content','delete_content' , 'add_container', 'edit_content', 'toggle_details'/*,'undo_action', 'redo_action'*/);
		this.is_edit_page = options.edit;
		this.collection = options.collection;
		this.is_clipboard = options.is_clipboard;
		this.render();
		this.queue_view = new QueueView.Queue({
	 		el: $("#queue-area"),
	 		collection: this.collection
	 	});
	 	$("#queue-area").css("display", (this.is_clipboard || !this.is_edit_page)? "none" : "block");
	 	$("#main-nav-home-button").removeClass("active");

	 	if(this.is_edit_page){
			$("#channel-edit-button").addClass("active");
	 	}else if(!this.is_clipboard){
	 		$("#channel-preview-button").addClass("active");
	 	}
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
		'click #hide_details_checkbox' :'toggle_details'
		/*'click .undo_button' : 'undo_action',
		'click .redo_button' : 'redo_action'*/
	},	
	remove_containers_from:function(index){
		while(this.containers.length > index){
			this.containers[this.containers.length-1].delete_view();
			this.containers.splice(this.containers.length-1);
		}
		this.containers[this.containers.length-1].close_folders();
	},
	/*
	undo_action: function(){
		console.log("undoing");
		this.undo();
	},
	redo_action:function(){
		this.redo();
	},*/
	add_container: function(index, topic){
		console.log("PERFORMANCE tree_edit/views.js: starting add_container ...");
    	var start = new Date().getTime();
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
		console.log("PERFORMANCE tree_edit/views.js: add_container end (time = " + (new Date().getTime() - start) + ")");
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
		for(var i = 0; i < this.containers.length; i++){
			if(this.containers[i].copy_selected())
				break;
		}
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
		//this.set_sort_orders(this.childrenCollection);
		this.render();
		
		/* Animate sliding in from left */
		this.$el.css('margin-left', -this.$el.find(".content-list").outerWidth());
		$("#container_area").width(this.$el.find(".content-list").outerWidth() * (this.index + 1));
		this.$el.animate({'margin-left' : "0px"}, 500);	
	},
	render: function() {
		console.log("*************RENDERING " + this.model.get("title") + "****************");
		DragHelper.removeDragDrop(this);
		this.childrenCollection = this.collection.get_all_fetch(this.model.get("children"));
		this.childrenCollection.sort_by_order();
		this.$el.html(this.template({
			topic: this.model, 
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
		console.log("PERFORMANCE tree_edit/views.js: starting load_content ...");
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
		console.log("PERFORMANCE tree_edit/views.js: load_content end (time = " + (new Date().getTime() - start) + ")");
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
		console.log("PERFORMANCE tree_edit/views.js: starting close_folders ...");
    	var start = new Date().getTime();
		this.views.forEach(function(entry){
			entry.set_opened(false, false);
		});
		console.log("PERFORMANCE tree_edit/views.js: close_folders end (time = " + (new Date().getTime() - start) + ")");
		//this.$el.find(".folder .glyphicon").css("display", "inline-block");
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
var ContentItem = BaseViews.BaseListItemView.extend({
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
			resource_count : (this.model.get("kind") == "topic")? this.model.getChildCount(false, this.containing_list_view.collection) : this.files.length
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
		this.set_opened(true, true);
		this.containing_list_view.add_container(this);
	},
	cancel_open_folder:function(event){
		event.preventDefault();
		event.stopPropagation();
	},
	set_opened:function(is_opened, animate){

		if(is_opened){
			console.log("PERFORMANCE tree_edit/views.js: starting set_opened " + this.model.get("title") + " ...");
    		var start = new Date().getTime();
			this.$el.addClass("current_topic");
			this.$el.attr("draggable", "false");

			/*Checks if opened topic has scrolled out of view*/
			var view = this;
			this.$el.on("offset_changed", function(){
				var container = view.containing_list_view.$el;
				var interior = view.containing_list_view.$el.find(".container-interior");
				if(interior.offset().top > view.$el.offset().top + view.$el.height())
					container.find(".top_border").css("visibility", "visible");
				else if(interior.offset().top + interior.height() < view.$el.offset().top)
					container.find(".bottom_border").css("visibility", "visible");
				else
					container.find(".boundary").css("visibility", "hidden");
			});
			this.$el.onOffsetChanged(function(){
				 view.$el.trigger('offset_changed');
			});
			console.log("PERFORMANCE tree_edit/views.js: set_opened " + this.model.get("title") + " end (time = " + ((new Date().getTime() - start)/1000) + "s)");
		}else{
			this.$el.off("offset_changed");
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
		var metadata_view = new UploaderViews.EditMetadataView({
			el : $("#dialog"),
			model: this.model,
			allow_add: false,
			main_collection : this.main_collection,
			modal: true,
			parent_view : this
		});
	},
	publish:function(){
		this.save({"published": true},{validate:false});
		this.publish_children(this.model, this.containing_list_view.collection);
		this.render();
	},
	publish_children:function(model, collection){
		var self = this;
		var children = collection.get_all_fetch(model.get("children"));
		children.forEach(function(entry){
			if(!entry.get("published")){
				entry.save({"published":true},{validate:false});
			}
			self.publish_children(this, collection);
		});
	},
	add_to_trash:function(){
		this.containing_list_view.add_to_trash([this]);
		this.render();
		this.delete_view();
	}
}); 

/* onOffsetChanged: handles when selected folder is offscreen */
$.fn.onOffsetChanged = function (trigger, millis) {
    if (millis == null) millis = 100;
    var o = $(this[0]); // our jquery object
    if (o.length < 1) return o;

    var lastOff = null;
    setInterval(function () {
        if (o == null || o.length < 1) return o;
        if (lastOff == null) lastOff = o.offset();
        var newOff = o.offset();
        if (lastOff.top != newOff.top) {
            $(this).trigger('onOffsetChanged', { lastOff: lastOff, newOff: newOff});
            if (typeof (trigger) == "function") trigger(lastOff, newOff);
            lastOff= o.offset();
        }
    }, millis);

    return o;
};

module.exports = {
	TreeEditView: TreeEditView
}