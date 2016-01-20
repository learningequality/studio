var Backbone = require("backbone");
var _ = require("underscore");
require("uploader.less");
var BaseViews = require("./../views");
var Models = require("./../models");

var AddContentView = BaseViews.BaseListView.extend({
	template: require("./hbtemplates/add_content_dialog.handlebars"),
	item_view:"adding_content",
	initialize: function(options) {
		_.bindAll(this, 'add_topic','close_uploader', 'edit_metadata');	
		this.collection = options.collection;
		this.root = options.root;
		this.containing_list_view = options.containing_list_view;
		this.render();
	},
	render: function() {
		this.$el.html(this.template({
			folder: root,
			node_list: this.collection.toJSON()
		}));
		this.load_content(this);
	},
	events: {
		'click #create_topic':'add_topic',
		'click .close_uploader' : 'close_uploader',
		'click .edit_metadata' : 'edit_metadata',
	},

	load_content:function(containing_list_view){
		/* TODO: Use if re-rendering previously selected items*/
		this.collection.forEach(function(entry){
			var node_view = new NodeListItem({
				edit: false,
				containing_list_view: containing_list_view,
				el: containing_list_view.$el.find("#" + entry.cid),
				model: entry
			});
			containing_list_view.views.push(node_view);
		});
	},
	add_topic:function(){
		$("#upload_content_add_list").append("<div id='new'></div>");
		var topic = this.collection.add({kind:"topic"});
		var item_view = new NodeListItem({
			edit: true,
			containing_list_view: this,
			el: this.$el.find("#new"),
			model: topic
		});
		console.log("adding", this.collection);
		this.views.push(item_view);
	},
	close_uploader: function(){
		this.delete_view();
	},
	edit_metadata: function(){
		var metadata_view = new EditMetadataView({
			collection: this.collection,
			containing_list_view: this.containing_list_view,
			el: this.$el,
			root: this.root
		});
		this.undelegateEvents();
		this.unbind();	
	},

	
});

var EditMetadataView = BaseViews.BaseListView.extend({
	template : require("./hbtemplates/edit_metadata_dialog.handlebars"),
	disable: false,
	current_node: null,
	unsaved_nodes: false,
	item_view:"uploading_content",
	initialize: function(options) {
		_.bindAll(this, 'close_uploader', "save_node", 'check_item',
						'add_tag','save_and_finish','add_more','set_edited');	
		this.containing_list_view = options.containing_list_view;
		this.collection = options.collection;
		this.root = options.root;
		this.render();
	},
	render: function() {
		this.$el.html(this.template({
			folder: root,
			node_list: this.collection.toJSON(),
		}));
		this.load_content();
	},
	events: {
		'click .close_uploader' : 'close_uploader',
		'click #upload_save_button' : 'save_node',
		'click #upload_save_finish_button' : 'save_and_finish',
		'click #add_more_button' : 'add_more',
		'click #uploader' : 'finish_editing',
		'click :checkbox' : 'check_item',
		'keypress #tag_box' : 'add_tag',
		'keypress .upload_input' : 'set_edited'
	},

	load_content:function(){
		var containing_list_view = this;
		var root = this.root;
		this.collection.forEach(function(entry){
			var node_view = new UploadedItem({
				model: entry,
				el: $("#uploaded_list #item_" + entry.cid),
				containing_list_view: containing_list_view,
				root: root,
			});
			containing_list_view.views.push(node_view);
		});
	},

	close_uploader: function(){
		if(this.model_queue.length > 0 && confirm("Unsaved Metadata Detected! Exiting now will"
			+ " undo any new changes. \n\nAre you sure you want to exit?")){
			this.delete_view();
		}
	},
	save_node: function(event){
		/* TODO :fix to save multiple nodes at a time */
		//this.current_view.save_node();
		this.save_all();
	},
	save_and_finish: function(event){
		//this.current_view.save_node();
		this.save_all();
		this.delete_view();
	},
	add_more:function(event){
		var content_view = new AddContentView({
			collection: this.collection,
			containing_list_view: this.containing_list_view,
			el: this.$el,
			root: this.root
		});
		this.undelegateEvents();
		this.unbind();	
	},
	set_current_node:function(view){
		/* TODO implement once allow multi file editing 
		if(this.current_node){
			this.current_node.set_edited(true);
			to_save.push(this.current_node);
		}*/
		this.current_node = this.collection.get({cid: view.model.cid});
		this.current_view = view;

		if(!this.disable){
			$("#input_title").val(this.current_node.attributes.title);
			$("#input_description").val(this.current_node.attributes.description);
		}
	},
	check_item: function(){
		this.disable = $("#uploaded_list").find(":checked").length > 1;
		this.containing_list_view.set_editing(this.disable);
		$("#input_title").val((this.disable || !this.current_node)? " " : this.current_node.attributes.title);
		$("#input_description").val((this.disable || !this.current_node)? " " : this.current_node.attributes.description);

		if(this.disable) {
			$(".upload_input").addClass("gray-out");
			//TODO: Clear tagging area $("#tag_area").html("");
		}
		else 
			$(".upload_input").removeClass("gray-out");
	},
	add_tag: function(event){
		if((!event.keyCode || event.keyCode ==13) && $("#tag_box").val().trim() != ""){
			/* TODO: FIX THIS LATER TO APPEND TAG VIEWS TO AREA*/
			$("#tag_area").append("<div class='col-xs-4 tag'>" + $("#tag_box").val().trim() + "</div>");
			$("#tag_box").val("");
		}
		
	},
	set_edited:function(event){
		this.enqueue();
		this.current_view.set_edited(true);
	},
	
});


var ContentItem =  BaseViews.BaseListItemView.extend({
	/* TODO: Implement once other types of content are implemented */
	remove_item: function(){
		this.containing_list_view.collection.remove(this.model);
		this.delete(false);
	},
	submit_item:function(){
		console.log("submitting",this.containing_list_view.collection);
		this.containing_list_view.collection.add(this.model);
		console.log("submitting",this.containing_list_view.collection);
	},
	delete_item: function(){
		this.delete(true);
	}
});



var NodeListItem = ContentItem.extend({
	template: require("./hbtemplates/content_list_item.handlebars"),
	initialize: function(options) {
		this.edit = options.edit;
		this.containing_list_view = options.containing_list_view;
		_.bindAll(this, 'submit_topic', 'edit_topic','remove_topic');
		this.$el.attr("id", this.model.cid);
		this.render();
	},
	render: function() {
		this.$el.html(this.template({
			topic: this.model,
			edit: this.edit,
			kind: this.model.attributes.kind.toUpperCase()
		}));
	},
	events: {
		'click .submit_topic' : 'submit_topic',
		'keypress .content_name' : 'submit_topic',
		'dblclick .folder_name' : 'edit_topic',
		'click .remove_topic' : 'remove_topic',
	},
	remove_topic: function(){
		this.remove_item();
		this.delete_view();
	},
	submit_topic : function(event){
		if(!event.keyCode || event.keyCode ==13){
			this.model.set({
				title: this.$el.find("input").val(),
				kind:"topic"
			});
			this.edit = false;
			this.submit_item();
			this.render();
		}
	},
	edit_topic: function(){
		this.edit = true;
		this.remove_item();
		this.enqueue();
		this.render();
	},
});


var UploadedItem = ContentItem.extend({
	tags: [],
	template: require("./hbtemplates/uploaded_list_item.handlebars"),
	initialize: function(options) {
		this.collection = options.collection;
		this.containing_list_view = options.containing_list_view;
		this.root = options.root;
		_.bindAll(this, 'remove_topic','set_current_node');	
		this.render();
	},
	render: function() {
		this.$el.html(this.template({
			topic: this.model,
			kind: this.model.attributes.kind.toUpperCase(),
			id: this.model.cid
		}));
	},
	events: {
		'click .remove_topic' : 'remove_topic',
		'click label' : 'set_current_node',
	},
	remove_topic: function(){
		this.delete_item();
	},
	set_edited:function(edited){
		if(edited)
			$("#item_" + this.model.cid + " .item_name").html(this.model.attributes.title + "<b>*</b>");
		else
			$("#item_" + this.model.cid + " .item_name").html(this.model.attributes.title);
	},
	save_node:function(){
		this.save({
			title: $("#input_title").val(), 
			description: $("#input_description").val(),
			parent: this.root.id
		});
	},
	set_current_node:function(event){
		event.preventDefault();
		$("#uploaded_list").find("li").css("background-color", "transparent");
		this.$el.css("background-color", "#E6E6E6");
		this.parent_view.set_current_node(this);
	}
});

module.exports = {
	AddContentView: AddContentView
}