var Backbone = require("backbone");
var _ = require("underscore");
require("queue.less");
var BaseViews = require("./../views");
var Models = require("./../models");
var DragHelper = require("edit_channel/utils/drag_drop");

/* Loaded when user clicks clipboard button below navigation bar */
var Queue = BaseViews.BaseWorkspaceView.extend({
	template: require("./hbtemplates/queue.handlebars"),
	clipboard_queue:null,
	trash_queue:null,
	clipboard_selector: "#clipboard-queue",
	trash_selector: "#trash-queue",

	initialize: function(options) {
		_.bindAll(this, 'toggle_queue', 'switch_to_queue', 'switch_to_trash');
		this.clipboard_root = options.clipboard_root;
		this.trash_root = options.trash_root;
		this.collection = options.collection;
		this.render();
	},
	render: function() {
		this.$el.html(this.template());
		this.clipboard_queue = new ClipboardList({
			collection: this.collection,
			model: this.clipboard_root,
			el: this.$(this.clipboard_selector),
			add_controls : true,
			container: this
		});
		this.trash_queue = new TrashList({
			collection: this.collection,
			model : this.trash_root,
			el: this.$(this.trash_selector),
			add_controls : true,
			container: this
		});
		this.switch_to_queue();
	},
	events: {
		'click .queue-button' : 'toggle_queue',
		'click #switch_to_queue' : 'switch_to_queue',
		'click #switch_to_trash' : 'switch_to_trash'
	},
	toggle_queue: function(){
		if(this.$("#queue").hasClass("closed")){
			this.$("#queue").removeClass("closed").addClass("opened");
		}else{
			this.$("#queue").removeClass("opened").addClass("closed");
		}
	},
	switch_to_queue:function(){
		this.trash_queue.switch_to(false);
		this.clipboard_queue.switch_to(true);
	},
	switch_to_trash:function(){
		this.clipboard_queue.switch_to(false);
		this.trash_queue.switch_to(true);
	}
});


var QueueList = BaseViews.BaseWorkspaceListView.extend({
	template: require("./hbtemplates/queue_list.handlebars"),
	selectedClass: "queue-selected",
	default_item: ".queue-list-wrapper >.content-list >.default-item, >.content-list >.default-item",
	list_selector: ".queue-list-wrapper >.content-list, >.content-list",
	badge_selector: null,
	tab_selector: null,
	list_wrapper_selector:null,
	item_class_selector: ".queue-item",

	bind_queue_list_functions:function(){
		_.bindAll(this, 'render','update_badge_count', 'switch_to');
		this.bind_workspace_functions();
	},
	switch_to:function(is_active){
		$(this.list_wrapper_selector).css("display", (is_active) ? "block" : "none");
		(is_active) ? $(this.tab_selector).addClass("active-queue-tab") : $(this.tab_selector).removeClass("active-queue-tab");
	},
	update_badge_count:function(){
	  	var self =this;
	  	if(this.add_controls){
	  		self.model.fetch({
	  			success:function(root){
	  				$(self.badge_selector).html(root.get("metadata").resource_count);
	  			}
	  		})
		}
	  },
	handle_if_empty:function(){
		this.$(this.default_item).css("display", (this.views.length > 0) ? "none" : "block");
		this.update_badge_count();
	}
});

var ClipboardList = QueueList.extend({
	badge_selector: ".queue-badge",
	tab_selector: "#switch_to_queue",
	list_wrapper_selector: "#clipboard-queue",

	initialize: function(options) {
		_.bindAll(this, 'delete_items', 'create_new_view');
		this.bind_queue_list_functions();
		this.collection = options.collection;
		this.container = options.container;
		this.add_controls = options.add_controls;
		this.render();
	},
	render: function() {
		this.$el.html(this.template({
			is_clipboard : true,
			add_controls : this.add_controls,
			id: this.model.id
		}));
		this.$(this.default_item).text("Loading...");
		var self = this;
		this.collection.get_all_fetch(this.model.get("children")).then(function(fetched){
			fetched.sort_by_order();
			self.$(self.default_item).text("No items found.");
			self.load_content(fetched);
			self.make_droppable();
		});
	},
	create_new_view:function(model){
		var item_view = new ClipboardItem({
				containing_list_view: this,
				model: model,
				container : this.container
			});
		this.views.push(item_view);
		return item_view;
	},
	events: {
		'change .select_all' : 'check_all',
		'click .delete_items' : 'delete_items',
		'click .edit_items' : 'edit_selected',
		'click .create_new_content' : 'add_topic',
		'click .upload_files_button': 'add_files',
		'click .import_content' : 'import_content'
	},
	delete_items:function(){
		if(confirm("Are you sure you want to delete these selected items?")){
			this.delete_selected();
		}
	},
	// handle_transfer_drop:function(transfer, sort_order, callback){
	// 	/* Implementation for copying nodes on drop*/
	// 	// transfer.model.duplicate(this.model, sort_order, function(){
	// 		// transfer.reload();
	// 		//callback();
	// 	// });
 //    }
});

var TrashList = QueueList.extend({
	badge_selector: ".trash-badge",
	tab_selector: "#switch_to_trash",
	list_wrapper_selector: "#trash-queue",

	initialize: function(options) {
		_.bindAll(this, 'delete_items', 'move_trash');
		this.bind_queue_list_functions();
		this.collection = options.collection;
		this.container = options.container;
		this.add_controls = options.add_controls;
		this.render();
	},
	render: function() {
		this.$el.html(this.template({
			is_clipboard : false,
			add_controls : this.add_controls,
			id: this.model.id
		}));
		this.$(this.default_item).text("Loading...");
		var self = this;
		this.collection.get_all_fetch(this.model.get("children")).then(function(fetched){
			fetched.sort_by_order();
			self.$(self.default_item).text("No items found.");
			self.load_content(fetched);
			self.make_droppable();
			self.update_badge_count();
		});
	},
	events: {
		'change .select_all' : 'check_all',
		'click .delete_items' : 'delete_items',
		'click .move_trash' : 'move_trash'
	},
	create_new_view:function(model){
		var item_view = new TrashItem({
				containing_list_view: this,
				model: model,
				container : this.container
			});
		this.views.push(item_view);
		return item_view;
	},
	delete_items:function(){
		if(confirm("Are you sure you want to delete these selected items permanently? Changes cannot be undone!")){
			this.delete_items_permanently("Deleting Content...");
		}
	},
	move_trash:function(){
		var list = this.get_selected();
		var moveCollection = new Models.ContentNodeCollection();
		var reload_list = [];
		for(var i =0;i < list.length; i++){
			var node = $("#" + list[i].id).data("data").model;
			if(reload_list.length === 0 || $(node.get("ancestors")).filter(reload_list).length === 0 ){
				moveCollection.add(node);
				reload_list.push(node.get("id"));
			}
		}
		this.add_to_clipboard(moveCollection, "Recovering Content to Clipboard...");
	}
});

/* Loaded when user clicks clipboard button below navigation bar */
var QueueItem = BaseViews.BaseWorkspaceListNodeItemView.extend({
	template: require("./hbtemplates/queue_item.handlebars"),
	selectedClass: "queue-selected",
	list_selector: null,
	expandedClass: "glyphicon-menu-down",
	collapsedClass: "glyphicon-menu-up",
	className: "queue-item",
	getToggler: function () { return this.$("#menu_toggle_" + this.model.id); },
	getSubdirectory: function () {return this.$("#" + this.id() +"_sub"); },
	'id': function() {
		return this.model.get("id");
	}
});

var ClipboardItem = QueueItem.extend({
	list_selector: "#clipboard_list",

	initialize: function(options) {
		_.bindAll(this, 'delete_content');
		this.bind_workspace_functions();
		this.containing_list_view = options.containing_list_view;
		this.container=options.container;
		this.render();
	},
	render: function(renderData) {
		this.$el.html(this.template({
			node:this.model.toJSON(),
			isfolder: this.model.get("kind") === "topic",
			is_clipboard : true,
		}));
		this.$el.data("data", this);
		this.make_droppable();
	},
	events: {
		'click .delete_content' : 'delete_content',
		'click .tog_folder' : 'toggle',
		'click .edit_content' : 'open_edit',
		'change input[type=checkbox]': 'handle_checked'
	},
	load_subfiles:function(){
		var data = {
			collection: this.containing_list_view.collection,
			el: this.$el.find("#" + this.id() +"_sub"),
			add_controls : false,
			model: this.model,
			container: this.container
		}
		this.subcontent_view = new ClipboardList(data);
		this.$el.find("#" + this.id() +"_sub").append(this.subcontent_view.el);
	},
	delete_content:function(){
		if(confirm("Are you sure you want to delete " + this.model.get("title") + "?")){
			this.add_to_trash();
		}
	}
});

var TrashItem = QueueItem.extend({
	list_selector: "#trash_list",
	initialize: function(options) {
		_.bindAll(this, 'delete_content');
		this.bind_workspace_functions();
		this.containing_list_view = options.containing_list_view;
		this.container=options.container;
		this.render();
	},
	render: function(renderData) {
		this.$el.html(this.template({
			node:this.model.toJSON(),
			isfolder: this.model.get("kind") === "topic",
			is_clipboard : false,
		}));
		this.$el.data("data", this);
		this.make_droppable();
	},
	events: {
		'click .delete_content' : 'delete_content',
		'click .tog_folder' : 'toggle',
		'change input[type=checkbox]': 'handle_checked'
	},
	load_subfiles:function(){
		var data = {
			collection: this.containing_list_view.collection,
			el: this.$el.find("#" + this.id() +"_sub"),
			add_controls : false,
			model: this.model,
			container: this.container
		}
		this.subcontent_view = new TrashList(data);
		this.$el.find("#" + this.id() +"_sub").append(this.subcontent_view.el);
	},
	delete_content:function(){
		if(confirm("Are you sure you want to PERMANENTLY delete " + this.model.get("title") + "? Changes cannot be undone!")){
			this.delete(true, "Deleting Content...");
		}
	}
});

module.exports = {
	Queue:Queue
}