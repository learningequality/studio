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

	initialize: function(options) {
		_.bindAll(this, 'toggle_queue', 'open_queue', 'close_queue');
		this.clipboard_root = options.clipboard_root;
		this.trash_root = options.trash_root;
		this.collection = options.collection;
		this.render();
		window.workspace_manager.set_queue_view(this);
	},
	render: function() {
		this.$el.html(this.template());
		this.clipboard_queue = new ClipboardList({
			collection: this.collection,
			model: this.clipboard_root,
			el: this.$(this.clipboard_selector),
			add_controls : true,
			container: this,
			content_node_view:null
		});
		this.handle_checked();
	},
	events: {
		'click .queue-button' : 'toggle_queue'
	},
	toggle_queue: function(){
		(this.$("#queue").hasClass("closed")) ? this.open_queue() : this.close_queue();
	},
	open_queue:function(){
		this.$("#queue").removeClass("closed").addClass("opened");
	},
	close_queue:function(){
		this.$("#queue").removeClass("opened").addClass("closed");
	},
	handle_checked:function(){
		this.clipboard_queue.handle_checked();
	},
	move_items:function(){
		var list = this.get_selected(true);
		var move_collection = new Models.ContentNodeCollection();
		/* Create list of nodes to move */
		for(var i = 0; i < list.length; i++){
			var model = list[i].model;
			model.view = list[i];
			move_collection.add(model);
		}
		this.move_content(move_collection);
	}
});


var ClipboardList = BaseViews.BaseWorkspaceListView.extend({
	template: require("./hbtemplates/queue_list.handlebars"),
	selectedClass: "queue-selected",
	default_item: ".queue-list-wrapper >.content-list >.default-item, >.content-list >.default-item",
	list_selector: ".queue-list-wrapper >.content-list, >.content-list",
	badge_selector: ".queue-badge",
	tab_selector: "#switch_to_queue",
	list_wrapper_selector: "#clipboard-queue",
	item_class_selector: ".queue-item",
	'id': function() {
		return "list_" + this.model.get("id");
	},
	initialize: function(options) {
		_.bindAll(this, 'delete_items', 'edit_items', 'handle_drop', 'move_items', 'update_badge_count');
		this.bind_workspace_functions();
		this.collection = options.collection;
		this.container = options.container;
		this.add_controls = options.add_controls;
		this.content_node_view = options.content_node_view;
		this.render();
		this.container.lists.push(this);
		this.listenTo(this.model, 'change:children', this.update_views);
		this.listenTo(this.model, 'change:metadata', this.update_badge_count);
	},
	render: function() {
		this.$el.html(this.template({
			is_clipboard : true,
			add_controls : this.add_controls,
			id: this.model.id
		}));
		window.workspace_manager.put_list(this.model.get("id"), this);
		this.$(this.default_item).text("Loading...");
		var self = this;
		self.make_droppable();
		this.retrieve_nodes(this.model.get("children")).then(function(fetchedCollection){
			self.$(self.default_item).text("No items found.");
			fetchedCollection.sort_by_order();
			self.load_content(fetchedCollection);
			self.refresh_droppable();
		});
	},
	events: {
		'change .select_all' : 'check_all',
		'click .delete_items' : 'delete_items',
		'click .edit_items' : 'edit_items',
		'click .move_items' : 'move_items',
		'click .create_new_content' : 'add_topic',
		'click .upload_files_button': 'add_files',
		'click .import_content' : 'import_content',
		'click .create_exercise_button' : 'add_exercise'
	},
	update_badge_count:function(){
	  	var self = this;
	  	if(this.add_controls){
	  		self.model.fetch({
	  			success:function(root){
	  				$(self.badge_selector).html(root.get("metadata").resource_count);
	  			}
	  		});
		}
	},
	handle_if_empty:function(){
		this.$(this.default_item).css("display", (this.model.get("children").length > 0) ? "none" : "block");
		this.update_badge_count();
	},
	handle_checked:function(){
		var checked_count = this.$el.find(".queue-selected").length;
		this.$(".queue-disable-none-selected *").prop("disabled", checked_count === 0);
		(checked_count > 0)? this.$(".queue-disable-none-selected *").removeClass("disabled") : this.$(".queue-disable-none-selected *").addClass("disabled");
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
	delete_items:function(){
		if(confirm("Are you sure you want to PERMANENTLY delete these selected items? Changes cannot be undone!")){
			this.delete_items_permanently("Deleting Content...");
			this.$(".select_all").attr("checked", false);
		}
	},
	edit_items:function(){
		this.container.edit_selected();
	},
	move_items:function(){
		this.container.move_items();
	}
	/* Implementation for creating copies of nodes when dropped onto clipboard */
	// handle_drop:function(collection){
	// 	this.$(this.default_item).css("display", "none");
	// 	console.log(this.model)
	// 	return collection.duplicate(this.model);
 // 	},
});

var ClipboardItem = BaseViews.BaseWorkspaceListNodeItemView.extend({
	list_selector: "#clipboard_list",
	template: require("./hbtemplates/queue_item.handlebars"),
	selectedClass: "queue-selected",
	expandedClass: "glyphicon-menu-down",
	collapsedClass: "glyphicon-menu-up",
	className: "queue-item",
	getToggler: function () { return this.$("#menu_toggle_" + this.model.id); },
	getSubdirectory: function () {return this.$("#" + this.id() +"_sub"); },
	'id': function() {
		return this.model.get("id");
	},
	reload:function(model){
		this.model.set(model.attributes);
		this.$el.find(">label .title").text(this.model.get("title"));
		this.$el.find(">label .badge").text(this.model.get("metadata").resource_count);
	},
	handle_checked:function(){
		this.checked = this.$el.find(">input[type=checkbox]").is(":checked");
		(this.checked)? this.$el.addClass(this.selectedClass) : this.$el.removeClass(this.selectedClass);
		this.container.handle_checked();
	},

	initialize: function(options) {
		_.bindAll(this, 'delete_content');
		this.bind_workspace_functions();
		this.containing_list_view = options.containing_list_view;
		this.container = options.container;
		this.render();
	},
	render: function(renderData) {
		this.$el.html(this.template({
			node:this.model.toJSON(),
			isfolder: this.model.get("kind") === "topic",
			is_clipboard : true,
			checked: this.checked
		}));
		this.handle_checked();
		window.workspace_manager.put_node(this.model.get("id"), this);
		this.make_droppable();
	},
	events: {
		'click .delete_content' : 'delete_content',
		'click .tog_folder' : 'toggle',
		'click .edit_content' : 'edit_item',
		'change input[type=checkbox]': 'handle_checked'
	},
	edit_item:function(){
		this.open_edit(true);
	},
	load_subfiles:function(){
		if(!this.subcontent_view){
			var data = {
				collection: this.containing_list_view.collection,
				el: this.$el.find("#" + this.id() +"_sub"),
				add_controls : false,
				model: this.model,
				container: this.container,
				content_node_view:this
			}
			this.subcontent_view = new ClipboardList(data);
			this.$el.find("#" + this.id() +"_sub").append(this.subcontent_view.el);
		}
	},
	delete_content:function(){
		if(confirm("Are you sure you want to PERMANENTLY delete " + this.model.get("title") + "? Changes cannot be undone!")){
			this.delete(true, "Deleting Content...");
		}
	}
	/* Implementation for creating copies of nodes when dropped onto clipboard */
	// handle_drop:function(collection){
	// 	return collection.duplicate(window.workspace_manager.get_queue_view().clipboard_queue.model);
 // 	},
});

module.exports = {
	Queue:Queue
}