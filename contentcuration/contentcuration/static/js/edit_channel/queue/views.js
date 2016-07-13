var Backbone = require("backbone");
var _ = require("underscore");
require("queue.less");
var BaseViews = require("./../views");
var Models = require("./../models");
var DragHelper = require("edit_channel/utils/drag_drop");

/* Loaded when user clicks clipboard button below navigation bar */
var Queue = BaseViews.BaseView.extend({
	template: require("./hbtemplates/queue.handlebars"),
	item_view:"queue",
	initialize: function(options) {
		_.bindAll(this, 'toggle_queue', 'switch_to_queue', 'switch_to_trash');
		this.render();
		this.$el.find("#queue").css("margin-right", -this.$el.find("#main-queue").outerWidth());
	},
	render: function() {
		this.$el.html(this.template());
		this.clipboard_root = window.current_channel.get_root("clipboard_tree");
		this.trash_root = window.current_channel.get_root("trash_tree");
		this.clipboard_queue = new QueueList({
			collection: this.collection,
			model: this.clipboard_root,
			el: this.$el.find("#clipboard-queue"),
			is_clipboard: true,
			add_controls : true,
			container: this
		});
		this.trash_queue = new QueueList({
			collection: this.collection,
			model : this.trash_root,
			el: this.$el.find("#trash-queue"),
			is_clipboard : false,
			add_controls : true,
			container: this
		});
		this.switch_tab("clipboard");
	},
	events: {
		'click .queue-button' : 'toggle_queue',
		'click .switch_to_queue' : 'switch_to_queue',
		'click .switch_to_trash' : 'switch_to_trash'
	},
	toggle_queue: function(){
		if(this.$el.find("#queue").css("margin-right") != "0px")
			this.$el.find("#queue").animate({marginRight:0}, 200);
		else
			this.$el.find("#queue").animate({marginRight: -this.$el.find("#main-queue").outerWidth()}, 200);
	},
	add_to_clipboard:function(collection){
		this.clipboard_queue.add_to_list(collection);
		this.trash_queue.model.fetch({async:false});
		this.trash_queue.render();
	},
	add_to_trash:function(collection){
		this.trash_queue.add_to_list(collection);
		this.clipboard_queue.model.fetch({async:false});
		this.clipboard_queue.render();
	},
	switch_to_queue:function(){
		this.switch_tab("clipboard");

	},
	switch_to_trash:function(){
		this.switch_tab("trash");
	},
	switch_tab:function(tabname){
		this.$el.find((tabname == "trash")? "#trash-queue" : "#clipboard-queue").css("display", "block");
		this.$el.find((tabname == "trash")? "#clipboard-queue" : "#trash-queue").css("display", "none");
		this.$el.find((tabname == "trash")? ".switch_to_trash" : ".switch_to_queue" ).addClass("active-queue-tab");
		this.$el.find((tabname == "trash")? ".switch_to_queue" : ".switch_to_trash" ).removeClass("active-queue-tab");
	}
});


var QueueList = BaseViews.BaseListView.extend({
	template: require("./hbtemplates/queue_list.handlebars"),
	item_view:"queue",
	initialize: function(options) {
		this.is_clipboard = options.is_clipboard;
		this.collection = options.collection;
		this.childrenCollection = this.collection.get_all_fetch(this.model.get("children"));
		this.collection.sort_by_order();
		//this.set_sort_orders(this.childrenCollection);
		this.add_controls = options.add_controls;
		this.container = options.container;
		_.bindAll(this, 'check_all', 'delete_items', 'edit_items', 'add_items', 'move_trash', 'search');
		this.render();
	},
	events: {
		'click #select_all_check' : 'check_all',
		'click .delete_items' : 'delete_items',
		'click .edit_items' : 'edit_items',
		'click .add_items' : 'add_items',
		'click .move_trash' : 'move_trash',
		'keydown .search_queue' : 'search'
	},
	render: function() {
		DragHelper.removeDragDrop(this);
		this.model.fetch({async:false});
		this.childrenCollection = this.collection.get_all_fetch(this.model.get("children"));
		this.childrenCollection.sort_by_order();
		this.$el.html(this.template({
			content_list : this.childrenCollection.toJSON(),
			is_clipboard : this.is_clipboard,
			add_controls : this.add_controls,
			id: this.model.id
		}));

		this.load_content();
		if(this.add_controls){
			$((this.is_clipboard)? ".queue-badge" : ".trash-badge").html(this.model.get("total_count"));
		}

		this.$el.data("container", this);
		this.$el.find("ul").data("list", this);
		this.$el.find(".default-item").data("data", {
			containing_list_view: this,
			index:0
		});
		DragHelper.addDragDrop(this);
	},
	load_content:function(){
		this.views = [];
		var self = this;
		this.list_index = 0;
		this.childrenCollection.forEach(function(entry){
			var item_view = new QueueItem({
				containing_list_view: self,
				model: entry,
				index : self.list_index ++,
				is_clipboard : self.is_clipboard,
				container : self.container
			});
			self.$el.find("#list_for_" + self.model.id).append(item_view.el);
			self.views.push(item_view);
		});
	},
	check_all :function(){
		this.$el.find(":checkbox").prop("checked", this.$el.find("#select_all_check").prop('checked'));
	},
	delete_items:function(){
		var list = this.$el.find('input:checked').parent("li");
		if(list.length == 0){
			alert("No items selected.");
		}else{
			if(confirm((this.is_clipboard)? "Are you sure you want to delete these selected items?" : "Are you sure you want to delete these selected items permanently? Changes cannot be undone!")){
				var self = this;
				this.display_load("Deleting Content...", function(){
					for(var i = 0; i < list.length; i++){
						if($("#" + list[i].id).data("data")){
							$("#" + list[i].id).data("data").remove_item();
						}

					}
					self.render();
				});

			}
		}
	},
	edit_items:function(){
		this.edit_selected();
	},
	move_trash:function(){
		var list = this.$el.find('input:checked').parent("li");
		if(list.length == 0){
			alert("No items selected.");
		}else{
			var moveCollection = new Models.ContentNodeCollection();
			for(var i =0 ;i < list.length; i++){
				moveCollection.add($("#" + list[i].id).data("data").model);
			}
			this.container.add_to_clipboard(moveCollection);
		}
	},
	search:function(){
		//if(this.$el.find(".search_queue").val().length > 2)
			//this.render();
	},
	add_items:function(){
		this.add_to_view();
	},
	add_to_list:function(collection){
		this.add_nodes(collection, this.childrenCollection.highest_sort_order);
		this.model.fetch({async:false});
	},
	add_to_trash:function(collection){
		this.container.add_to_trash(collection);
	},
	add_to_clipboard:function(collection){
		this.container.add_to_clipboard(collection);
	}
});

/* Loaded when user clicks clipboard button below navigation bar */
var QueueItem = BaseViews.BaseListNodeItemView.extend({
	template: require("./hbtemplates/queue_item.handlebars"),
	tagName: "li",
	'id': function() {
		return this.model.get("id");
	},
	initialize: function(options) {
		_.bindAll(this, 'remove_item', 'toggle','edit_item', 'submit_item');
		this.containing_list_view = options.containing_list_view;
		this.allow_edit = false;
		this.is_clipboard = options.is_clipboard;
		this.index = options.index;
		this.container=options.container;
		this.render();
	},
	events: {
		'click .delete_content' : 'delete_content',
		'click .tog_folder' : 'toggle',
		'click .edit_content' : 'edit_item',
		'click .submit_content' : "submit_item",
		'keydown .queue_title_input' : "submit_item",
		'dblclick .queue_item_title' : 'edit_item'
	},
	reload:function(){
		this.model.fetch({async:false});
		this.render();
	},
	render: function() {
		this.$el.html(this.template({
			node:this.model,
			isfolder: this.model.get("kind").toLowerCase() == "topic",
			allow_edit: this.allow_edit,
			sub_list: this.model.get("children"),
			is_clipboard : this.is_clipboard,
			index: this.index
		}));
		this.$el.data("data", this);
	},
	toggle:function(){
		event.stopPropagation();
		event.preventDefault();
		this.load_subfiles();
		//console.log("toggling", this.$el.find("#" + this.id() +"_sub"));
		var el =  this.$el.find("#menu_toggle_" + this.model.id);
		if(el.hasClass("glyphicon-menu-up")){
			this.$el.find("#" + this.id() +"_sub").slideDown();
			el.removeClass("glyphicon-menu-up").addClass("glyphicon-menu-down");
		}else{
			this.$el.find("#" + this.id() +"_sub").slideUp();
			el.removeClass("glyphicon-menu-down").addClass("glyphicon-menu-up");
		}

		var containing_element = this.container.$el.find((this.is_clipboard)? "#clipboard_list" : "#trash_list");
		containing_element.scrollLeft(containing_element.width());
	},
	load_subfiles:function(){
		//console.log("SUBFILES ", this.$el.find("#" + this.id() +"_sub"));
		this.subfile_view = new QueueList({
			collection: this.containing_list_view.collection,
			el: this.$el.find("#" + this.id() +"_sub"),
			is_clipboard : this.is_clipboard,
			add_controls : false,
			model: this.model,
			container: this.container
		});
		this.$el.find("#" + this.id() +"_sub").append(this.subfile_view.el);
	},
	delete_content:function(){
		event.stopPropagation();
		event.preventDefault();
		this.remove_item(true);
	},
	remove_item: function(prompt){
		if((prompt && confirm("Are you sure you want to delete " + this.model.get("title") + "?")) || !prompt){
			if(this.is_clipboard){
				this.add_to_trash();
			}else{
				this.model.destroy({async:false});
			}
			if(prompt){
				this.containing_list_view.render();
			}
		}
	},
	edit_item: function(){
		event.stopPropagation();
		event.preventDefault();
		this.open_edit();
		/*
		this.allow_edit = true;
		this.render();
		*/
	},
	submit_item:function(event){
		if(!event.keyCode || event.keyCode ==13){
			this.model.set({title: this.$el.find(".queue_title_input").val().trim()}, {validate:true});
			if(this.model.validationError){
				this.$el.find(".node_title_textbox").addClass("error_input");
				this.$el.find(".error_msg").html(this.model.validationError);
			}
			else{
				this.save();
				this.allow_edit = false;
				this.render();
			}
		}
	},
	add_to_trash:function(){
		var individualCollection = new Models.ContentNodeCollection();
		individualCollection.add(this.model);
		this.containing_list_view.add_to_trash(individualCollection);
		this.delete_view();
	},
	add_to_clipboard:function(){
		var individualCollection = new Models.ContentNodeCollection();
		individualCollection.add(this.model);
		this.containing_list_view.add_to_clipboard(individualCollection);
	}
});

module.exports = {
	Queue:Queue
}