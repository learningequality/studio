var Backbone = require("backbone");
var _ = require("underscore");
require("uploader.less");
var BaseViews = require("./../views");
var Models = require("./../models");

var AddContentView = BaseViews.BaseListView.extend({
	template: require("./hbtemplates/add_content_dialog.handlebars"),
	item_view:"uploading_content",
	initialize: function(options) {
		_.bindAll(this, 'add_topic','close_uploader', 'edit_metadata','upload_file','add_file');	
		this.collection = options.collection;
		this.main_collection = options.main_collection;
		this.root = options.root;
		this.parent_view = options.parent_view;
		this.render();
		this.counter = 0;
	},
	render: function() {
		this.$el.html(this.template({
			folder: this.root,
			node_list: this.collection.toJSON()
		}));
		this.load_content();
		this.parent_view.set_editing(true);
	},
	events: {
		'click #create_topic':'add_topic',
		'click .close_uploader' : 'close_uploader',
		'click .edit_metadata' : 'edit_metadata',
		'click #upload_file' : 'upload_file',
		'change input:file' : 'add_file'
	},

	load_content:function(){
		var self = this;
		/* TODO: Use if re-rendering previously selected items*/
		this.collection.forEach(function(entry){
			var node_view = new NodeListItem({
				edit: false,
				containing_list_view: self,
				el: self.$el.find("#content_item_" + entry.cid),
				model: entry,
				root: this.root
			});
			self.views.push(node_view);
		});
	},
	add_topic:function(){
		$("#upload_content_add_list").append("<div id='new'></div>");
		var topic = new Models.NodeModel({
			"kind":"topic", 
			"title": (this.counter > 0)? "Topic " + this.counter : "Topic"
		});
		console.log("Adding", topic);
		this.collection.add(topic);
		this.counter++;
		var item_view = new NodeListItem({
			edit: true,
			containing_list_view: this,
			el: this.$el.find("#new"),
			model: topic,
			root: this.root,
		});
		this.views.push(item_view);
	},
	close_uploader: function(){
		this.delete_view();
	},
	edit_metadata: function(){
		var metadata_view = new EditMetadataView({
			collection: this.collection,
			parent_view: this.parent_view,
			el: this.$el,
			root: this.root,
			allow_add: true,
			main_collection : this.main_collection
		});
		this.undelegateEvents();
		this.unbind();	
	},
	upload_file:function(){
		this.$el.find("#file-dialog").trigger('click');
	},
	add_file:function(){
		/* TODO: Need to implement uploading files
		$("#upload_content_add_list").append("<div id='new'></div>");
		var item_view = new NodeListItem({
			edit: false,
			containing_list_view: this,
			el: this.$el.find("#new"),
			model: file,
			root: this.root,
		});
		this.views.push(item_view);
		*/
	}
});

var EditMetadataView = BaseViews.BaseListView.extend({
	template : require("./hbtemplates/edit_metadata_dialog.handlebars"),
	disable: false,
	current_node: null,
	item_view:"uploading_content",
	initialize: function(options) {
		_.bindAll(this, 'close_uploader', "save_nodes", 'check_item',
						'add_tag','save_and_finish','add_more','set_edited');	
		this.parent_view = options.parent_view;
		this.collection = options.collection;
		this.allow_add = options.allow_add;
		this.root = options.root;
		this.main_collection = options.main_collection;
		this.render();
		this.parent_view.set_editing(true);

	},
	render: function() {
		this.$el.html(this.template({
			folder: this.root,
			node_list: this.collection.toJSON(),
			allow_add: this.allow_add
		}));
		this.load_content();
		console.log("COLLECTION IS NOW", this.collection);
	},
	events: {
		'click .close_uploader' : 'close_uploader',
		'click #upload_save_button' : 'save_nodes',
		'click #upload_save_finish_button' : 'save_and_finish',
		'click #add_more_button' : 'add_more',
		'click #uploader' : 'finish_editing',
		'click :checkbox' : 'check_item',
		'keypress #tag_box' : 'add_tag',
		'keyup .upload_input' : 'set_edited'
	},

	load_content:function(){
		var self = this;
		var root = (this.allow_add)? this.root :null;
		this.views = [];
		this.collection.forEach(function(entry){
			var node_view = new UploadedItem({
				model: entry,
				el: self.$el.find("#uploaded_list #item_" + entry.cid),
				containing_list_view: self,
				root: root,
			});
			self.views.push(node_view);
		});
	},

	close_uploader: function(){
		if(this.model_queue.length == 0 || confirm("Unsaved Metadata Detected! Exiting now will"
			+ " undo any new changes. \n\nAre you sure you want to exit?")){
			this.parent_view.render();
			this.parent_view.set_editing(false);
			this.delete_view();
		}else{
			this.reset();
		}
	},
	save_nodes: function(){
		/* TODO :fix to save multiple nodes at a time */
		//this.current_view.save_node();
		var collection = this.parent_view.collection;
		$(this.views).each(function(){
			this.save(this.model.attributes);
			collection.add(this.model);
			this.set_edited(false);
		});
		collection.save();
		this.parent_view.render();
		//this.main_collection.add(this.collection);
	},
	save_and_finish: function(){
		this.save_nodes();
		this.parent_view.set_editing(false);
		this.parent_view.render();
		this.delete_view();
	},
	add_more:function(event){
		if(this.model_queue.length == 0 || confirm("Unsaved Data Detected! Exiting now will"
			+ " undo any new changes. \n\nAre you sure you want to exit?")){
			var content_view = new AddContentView({
				collection: this.collection,
				parent_view: this.parent_view,
				el: this.$el,
				root: (this.allow_add)? this.root : null,
				main_collection : this.main_collection
			});
			this.undelegateEvents();
			this.unbind();	
		}else{
			this.reset();
		}
	},
	set_current_node:function(view){
		/* TODO implement once allow multi file editing 
		if(this.current_node){
			this.current_node.set_edited(true);
			to_save.push(this.current_node);
		}*/
		this.$el.find("#title_error").css("display", (this.current_view && this.$el.find("#input_title").val().trim() == "")? "inline" : "none");
		this.$el.find("#description_error").css("display", (this.current_view && this.$el.find("#input_description").val().trim() == "")? "inline" : "none");
		if(!this.current_view || (this.$el.find("#input_title").val().trim() != "" && this.$el.find("#input_description").val().trim() !="")){
			if(this.current_view){
				if(this.allow_add)
					this.current_view.set_node();
				this.current_view.render();
				this.current_view.$el.css("background-color", "transparent");
			}

			this.current_node = this.collection.get({cid: view.model.cid});
			this.current_view = view;

			this.current_view.$el.css("background-color", "#E6E6E6");

			if(!this.disable){
				this.parent_view.set_editing(false);
				this.$el.find("#input_title").val(this.current_node.attributes.title);
				this.$el.find("#input_description").val(this.current_node.attributes.description);
			}			
		}
	},
	check_item: function(){
		this.disable = this.$el.find("#uploaded_list :checked").length > 1;
		this.parent_view.set_editing(this.disable);
		this.$el.find("#input_title").val((this.disable || !this.current_node)? " " : this.current_node.attributes.title);
		this.$el.find("#input_description").val((this.disable || !this.current_node)? " " : this.current_node.attributes.description);

		if(this.disable) {
			this.$el.find(".disable-on-edit").addClass("gray-out");
			//TODO: Clear tagging area $("#tag_area").html("");
		}
		else 
			this.$el.find(".upload_input").removeClass("gray-out");
	},
	add_tag: function(event){
		if((!event.keyCode || event.keyCode ==13) && this.$el.find("#tag_box").val().trim() != ""){
			/* TODO: FIX THIS LATER TO APPEND TAG VIEWS TO AREA*/
			this.$el.find("#tag_area").append("<div class='col-xs-4 tag'>" + this.$el.find("#tag_box").val().trim() + "</div>");
			this.$el.find("#tag_box").val("");
		}
	},
	set_edited:function(event){
		this.current_view.enqueue();
		this.current_view.set_edited(true);
		this.current_view.set_node();
	},
	
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
	},
});



var NodeListItem = ContentItem.extend({
	template: require("./hbtemplates/content_list_item.handlebars"),
	initialize: function(options) {
		_.bindAll(this, 'submit_topic', 'edit_topic','remove_topic');
		this.edit = options.edit;
		this.root = options.root;
		this.containing_list_view = options.containing_list_view;
		
		this.$el.attr("id", this.model.cid);
		this.render();
		
		this.model.set({
			parent: this.root.id
		});
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
		'click .remove_topic' : 'remove_topic',
	},
	remove_topic: function(){
		this.remove_item();
		this.delete_view();
	},
	submit_topic : function(event){
		this.model.set({
			title: this.$el.find("input").val(),
			kind:"topic",
			parent: this.root.id
		});
		this.submit_item();
		if(!event.keyCode || event.keyCode ==13){
			this.edit = false;
			this.render();
		}
	},
	edit_topic: function(){
		this.edit = true;
		this.remove_item();
		this.enqueue();
		this.render();
	}
});


var UploadedItem = ContentItem.extend({
	tags: [],
	template: require("./hbtemplates/uploaded_list_item.handlebars"),
	initialize: function(options) {
		_.bindAll(this, 'remove_topic','set_current_node');	
		this.containing_list_view = options.containing_list_view;
		this.root = options.root;
		
		this.edited = false;
		this.render();

	},
	render: function() {
		this.$el.html(this.template({
			topic: this.model,
			kind: this.model.attributes.kind.toUpperCase(),
			id: this.model.cid,
		}));
		this.set_edited(this.edited);
	},
	events: {
		'click .remove_topic' : 'remove_topic',
		'click label' : 'set_current_node',
	},
	remove_topic: function(){
		this.delete_item();
	},
	set_edited:function(edited){
		this.edited = edited;
		$("#item_" + this.model.cid + " .item_name").html(this.model.attributes.title + ((edited) ? " <b>*</b>" : ""));
	},
	
	set_current_node:function(event){
		event.preventDefault();
		this.containing_list_view.set_current_node(this);
	},
	save_node:function(){
		console.log("calling save node");
		this.set_edited(false);
		this.save({
			title: $("#input_title").val(), 
			description: $("#input_description").val(),
			parent: (this.root.id) ? this.root.id : this.model.parent
		});
	},
	set_node:function(){
		this.model.set({
			title: $("#input_title").val(), 
			description: $("#input_description").val(),
			parent: (this.root.id) ? this.root.id : this.model.parent
		});
	},
});

module.exports = {
	AddContentView: AddContentView,
	EditMetadataView:EditMetadataView
}