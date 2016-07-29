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
		this.resolve = options.resolve;
		this.reject = options.reject;
		this.render(this.resolve, this.reject);
		this.$el.find("#queue").css("margin-right", -this.$el.find("#main-queue").outerWidth());
	},
	render: function(resolve, reject) {
		this.$el.html(this.template());
		this.clipboard_root = window.current_user.get_clipboard();
		this.trash_root = window.current_channel.get_root("trash_tree");
		this.clipboard_queue = new ClipboardList({
			collection: this.collection,
			model: this.clipboard_root,
			el: this.$el.find("#clipboard-queue"),
			is_clipboard: true,
			add_controls : true,
			container: this
		});
		this.trash_queue = new TrashList({
			collection: this.collection,
			model : this.trash_root,
			el: this.$el.find("#trash-queue"),
			is_clipboard : false,
			add_controls : true,
			container: this
		});
		this.switch_tab("clipboard");
		resolve(true);
	},
	events: {
		'click .queue-button' : 'toggle_queue',
		'click .switch_to_queue' : 'switch_to_queue',
		'click .switch_to_trash' : 'switch_to_trash'
	},
	toggle_queue: function(){
		if(this.$el.find("#queue").css("margin-right") != "0px"){
			this.$el.find(".content-list").css("display", "block");
			this.$el.find("#queue").animate({marginRight:0}, 200);

		}
		else{
			this.$el.find("#queue").animate({marginRight: -this.$el.find("#main-queue").outerWidth()}, 200);
			this.$el.find(".content-list").css("display", "none");
		}
	},
	add_to_clipboard:function(collection, resolve, reject){
		this.clipboard_queue.add_to_list(collection, resolve, reject);
		var self = this;
		this.trash_queue.model.fetch({
			success:function(root){
				self.trash_queue.render();
			},
			error:function(obj, error){
				console.log("Error loading trash", obj);
                console.log("Error message:", error);
                console.trace();
			}
		});

	},
	add_to_trash:function(collection, resolve, reject){
		var self = this;
		var promise = new Promise(function(resolve, reject){
			self.trash_queue.add_to_list(collection, resolve, reject);
		});
		promise.then(function(){
			self.clipboard_queue.model.fetch({
				success:function(root){
					self.clipboard_queue.render();
					resolve(root);
				},
				error:function(obj, error){
	                reject(error);
				}
			});
		}).catch(function(error){
			reject(error)
		});
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
	item_class:"queue-item",
	render: function() {
		// DragHelper.removeDragDrop(this);
		var self = this;
		this.model.fetch({
			success:function(root){
				self.childrenCollection = self.collection.get_all_fetch(root.get("children"));
				self.childrenCollection.sort_by_order();
				self.$el.html(self.template({
					content_list : self.childrenCollection.toJSON(),
					is_clipboard : self.is_clipboard,
					add_controls : self.add_controls,
					id: root.id
				}));

				self.load_content();
				self.$el.data("container", self);
				self.$el.find("ul").data("list", self);
				self.$el.find(".default-item").data("data", {
					containing_list_view: self,
					index:0
				});
				DragHelper.addSortable(self, 'queue-selected', self.drop_in_container);
				$(".content-list").sortable( "refresh" );
			}
		});

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
			// DragHelper.addDragDrop(self);
		});
		this.check_number_of_items_in_list();
	},
	check_all :function(){
		this.$el.find(":checkbox").prop("checked", this.$el.find("#select_all_check_" + this.model.id).prop('checked'));
	},
	delete_items:function(){
		var list = this.$el.find('input:checked').parent("li");
		if(list.length == 0){
			alert("No items selected.");
		}else{
			if(confirm((this.is_clipboard)? "Are you sure you want to delete these selected items?" : "Are you sure you want to delete these selected items permanently? Changes cannot be undone!")){
				var self = this;
				this.display_load("Deleting Content...", function(resolve, reject){
					try{
						var promise_list = [];
						for(var i = 0; i < list.length; i++){
							if($("#" + list[i].id).data("data")){
								var promise = new Promise(function(resolve, reject){
									$("#" + list[i].id).data("data").remove_item(false, resolve);
								});
								promise_list.push(promise);
							}
						}
	    				Promise.all(promise_list).then(function(){
	    					self.render();
							resolve("Success!");
	    				});
					}catch(error){
						reject(error);
					}
				});

			}
		}
	},
	search:function(){
		//if(this.$el.find(".search_queue").val().length > 2)
			//this.render();
	},
	add_to_list:function(collection, resolve, reject){
		var self = this;
		var promise = new Promise(function(resolve, reject){
			self.add_nodes(collection, self.childrenCollection.highest_sort_order, resolve, reject);
		});
		promise.then(function(){
			self.model.fetch({
				success:function(model){
					resolve(model);
				},
				error:function(obj, error){
					reject(error);
				}
			});
		}).catch(function(error){
			reject(error)
		});


	},
	add_to_trash:function(collection, resolve, reject){
		this.container.add_to_trash(collection, resolve, reject);
	},

	check_number_of_items_in_list:function(){
    	this.$(".default-item").css("display", (this.views.length === 0) ? "block" : "none");
    	var self =this;
    	if(this.add_controls){
    		self.model.fetch({
    			success:function(root){
    				$((self.is_clipboard)? ".queue-badge" : ".trash-badge").html(root.get("metadata").total_count);
    				self.$el.find(".queue-list-wrapper>.content-list>.default-item").css("display", (root.get("metadata").total_count > 0)? "none" : "block");
    			}
    		})

		}
    },
    create_new_item:function(model){
    	return new QueueItem({
					containing_list_view: this,
					model:model,
					index : this.list_index ++,
					is_clipboard : this.is_clipboard,
					container : this.container
				});
    }
});

var ClipboardList = QueueList.extend({
	initialize: function(options) {
		this.is_clipboard = options.is_clipboard;
		this.collection = options.collection;
		this.childrenCollection = this.collection.get_all_fetch(this.model.get("children"));
		this.collection.sort_by_order();
		//this.set_sort_orders(this.childrenCollection);
		this.add_controls = options.add_controls;
		this.container = options.container;
		_.bindAll(this, 'check_all', 'delete_items', 'edit_items', 'add_topic', 'import_content', 'handle_transfer_drop',
					'create_new_item','import_nodes', 'add_files','check_number_of_items_in_list','render','drop_in_container');
		this.render();
	},
	events: {
		'change .select_all' : 'check_all',
		'click .delete_items' : 'delete_items',
		'click .edit_items' : 'edit_items',
		'click .create_new_content' : 'add_topic',
		'click .upload_files_button': 'add_files',
		'click .import_content' : 'import_content'
	},
	edit_items:function(){
		var list = this.$el.find('input:checked').parent("li");
		if(list.length == 0){
			alert("No items selected.");
		}else{
			this.edit_selected();
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
	initialize: function(options) {
		this.is_clipboard = options.is_clipboard;
		this.collection = options.collection;
		this.childrenCollection = this.collection.get_all_fetch(this.model.get("children"));
		this.collection.sort_by_order();
		//this.set_sort_orders(this.childrenCollection);
		this.add_controls = options.add_controls;
		this.container = options.container;
		_.bindAll(this, 'check_all', 'delete_items', 'move_trash','check_number_of_items_in_list','handle_transfer_drop','drop_in_container');
		this.render();
	},
	events: {
		'change .select_all' : 'check_all',
		'click .delete_items' : 'delete_items',
		'click .move_trash' : 'move_trash'
	},
	move_trash:function(){
		var list = this.$el.find('input:checked').parent("li");
		if(list.length == 0){
			alert("No items selected.");
		}else{
			var self = this;
			this.display_load("Recovering Content to Clipboard...", function(resolve, reject){
				try{
					var moveCollection = new Models.ContentNodeCollection();
					var ancestor_list = [];
					for(var i =0 ;i < list.length; i++){
						var node = $("#" + list[i].id).data("data").model;
						if(ancestor_list.length === 0 || $(node.get("ancestors")).filter(ancestor_list).length < 2){
							moveCollection.add(node);
							ancestor_list.push(node.get("id"));
						}
					}
					var promise = new Promise(function(resolve, reject){
						self.container.add_to_clipboard(moveCollection, resolve, reject);
					});
					promise.then(function(){
						resolve("Success!");
					}).catch(function(error){
						reject(error)
					});
				}catch(error){
					reject(error);
				}
			});

		}
	}
});

/* Loaded when user clicks clipboard button below navigation bar */
var QueueItem = BaseViews.BaseListNodeItemView.extend({
	template: require("./hbtemplates/queue_item.handlebars"),
	tagName: "li",
	selectedClass: "queue-selected",
	'id': function() {
		return this.model.get("id");
	},
	initialize: function(options) {
		_.bindAll(this, 'remove_item', 'toggle','edit_item', 'submit_item','render','handle_checked','handle_hover','handle_drop','hover_open_folder');
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
		'dblclick .queue_item_title' : 'edit_item',
		'change input[type=checkbox]': 'handle_checked'
	},
	// reload:function(){
	// 	var self = this;
	// 	this.model.fetch({
	// 		success:function(){
	// 			self.render();
	// 			if(self.subcontent_view){
	// 				// self.load_subfiles();
	// 				// self.$("#" + self.id() +"_sub").css("display", "block");
	// 				// self.$("#menu_toggle_" + self.model.id).removeClass("glyphicon-menu-up").addClass("glyphicon-menu-down");
	// 				// self.subcontent_view.assign_indices();
	// 				self.subcontent_view.check_number_of_items_in_list();
	// 			}else{
	// 				self.containing_list_view.assign_indices();
	// 				self.containing_list_view.check_number_of_items_in_list();
	// 			}
	// 		}
	// 	});
	// },
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
		if(this.model.get("kind") == "topic"){
			DragHelper.addTopicDragDrop(this, this.handle_hover, this.handle_drop);
		}
	},
	toggle:function(event){
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
		var data = {
			collection: this.containing_list_view.collection,
			el: this.$el.find("#" + this.id() +"_sub"),
			is_clipboard : this.is_clipboard,
			add_controls : false,
			model: this.model,
			container: this.container
		}
		if(this.is_clipboard){
			this.subcontent_view = new ClipboardList(data);
		}else{
			this.subcontent_view = new TrashList(data);
		}

		this.$el.find("#" + this.id() +"_sub").append(this.subcontent_view.el);
	},
	delete_content:function(){
		event.stopPropagation();
		event.preventDefault();
		var self = this;
		var promise = new Promise(function(resolve, reject){
			self.remove_item(true, resolve);
		});
		promise.then(function(){
			self.delete_view();
		}).catch(function(error){
			reject(error)
		});

	},
	remove_item: function(prompt, resolve){
		if((prompt && confirm("Are you sure you want to delete " + this.model.get("title") + "?")) || !prompt){
			if(this.is_clipboard){
				this.add_to_trash(resolve);
			}else{
				var self = this;
				this.model.destroy({
					success:function(){
						self.$el.remove();
						if(prompt){
							self.containing_list_view.render();
							self.containing_list_view.check_number_of_items_in_list();
						}else{
							if(resolve)
								resolve("Success!");
						}
					},
					error:function(obj, error){
						console.log("Error deleting item", obj);
		                console.log("Error message:", error);
		                console.trace();
					}
				});
			}
		}
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
	hover_open_folder:function(event){
		if(this.$el.find("#menu_toggle_" + this.model.id).hasClass("glyphicon-menu-up")){
			this.toggle(event);
		}
	}
});

module.exports = {
	Queue:Queue
}