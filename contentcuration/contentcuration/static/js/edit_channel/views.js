var Backbone = require("backbone");
var _ = require("underscore");
var Models = require("./models");
//var UndoManager = require("backbone-undo");

var BaseView = Backbone.View.extend({
	display_load:function(message, callback){
    var self = this;
		var load = '<div id="loading_modal" class="text-center fade">' +
            '<div id="kolibri_load_gif"></div>' +
            '<h4 id="kolibri_load_text" class="text-center">' + message + '</h4>' +
            '</div>';
    $(load).appendTo('body');
    if(callback){
			var promise = new Promise(function(resolve, reject){
				callback(resolve, reject);
			});
			promise.then(function(){
				$("#loading_modal").remove();
			})
			// }).catch(function(error){
			// 	$("#kolibri_load_text").text("Error with asychronous call. Please refresh the page");
			// 	console.log("Error with asychronous call", error);
			// });
  	}else{
  		$("#loading_modal").remove();
  	}
  },
  	reload_ancestors:function(collection, include_collection = true){
		var list_to_reload = (include_collection) ? collection.pluck("id") : [];
		var self = this;
		collection.forEach(function(entry){
      		$.merge(list_to_reload, entry.get("ancestors"));
		});
		this.retrieve_nodes($.unique(list_to_reload), true).then(function(fetched){
			fetched.forEach(function(model){
				var object = window.workspace_manager.get(model.get("id"));
				console.log(object);
				if(object.node){
					object.node.reload(model);
				}
				if(object.list){
					object.list.set_root_model(model);
				}
				if(model.id === window.current_channel.get("main_tree").id){
					self.check_if_published(model);
				}
			});
		});
	},
	retrieve_nodes:function(ids, force_fetch = false){
		return window.channel_router.nodeCollection.get_all_fetch(ids, force_fetch);
	},
	fetch_model:function(model){
		return new Promise(function(resolve, reject){
            model.fetch({
                success:function(data){
                    resolve(data)
                },
                error:function(error){
                    reject(error);
                }
            });
        });
	},
	check_if_published:function(root){
		var is_published = root.get("published");
		$("#hide-if-unpublished").css("display", (is_published) ? "inline-block" : "none");
		if(root.get("metadata").has_changed_descendant){
			$("#channel-publish-button").prop("disabled", false);
			$("#channel-publish-button").text("PUBLISH");
			$("#channel-publish-button").removeClass("disabled");
		}else{
			$("#channel-publish-button").prop("disabled", true);
			$("#channel-publish-button").text("No changes detected");
			$("#channel-publish-button").addClass("disabled");
		}
	},
});

var BaseWorkspaceView = BaseView.extend({
	lists: [],
	bind_workspace_functions:function(){
		_.bindAll(this, 'reload_ancestors','publish' , 'edit_permissions', 'handle_published',
			'edit_selected', 'add_to_trash', 'add_to_clipboard', 'get_selected');
	},
	publish:function(){
		if(!$("#channel-publish-button").hasClass("disabled")){
			var Exporter = require("edit_channel/export/views");
			var exporter = new Exporter.ExportModalView({
				model: window.current_channel.get_root("main_tree"),
				onpublish: this.handle_published
			});
		}
	},
	handle_published:function(collection){
		this.reload_ancestors(collection);
		$("#publish-get-id-modal").modal("show");
	},
	edit_permissions:function(){
		var ShareViews = require("edit_channel/share/views");
		var share_view = new ShareViews.ShareModalView({
			model:window.current_channel,
			current_user: window.current_user
		});
	},
	edit_selected:function(){
		var UploaderViews = require("edit_channel/uploader/views");
		var list = this.get_selected();
		var edit_collection = new Models.ContentNodeCollection();
		/* Create list of nodes to edit */
		for(var i = 0; i < list.length; i++){
			var model = list[i].model;
			model.view = list[i];
			edit_collection.add(model);
		}
		$("#main-content-area").append("<div id='dialog'></div>");
		var content = null;
		if(edit_collection.length ==1){
			content = edit_collection.models[0];
		}

		var metadata_view = new UploaderViews.MetadataModalView({
			collection: edit_collection,
			el: $("#dialog"),
			model: content,
			new_content: false,
		    onsave: this.reload_ancestors
		});
	},
	add_to_trash:function(collection, message="Moving to Clipboard..."){
		return this.move_to_queue_list(collection, window.workspace_manager.get_queue_view().trash_queue, message);
	},
	add_to_clipboard:function(collection, message="Deleting Content..."){
		return this.move_to_queue_list(collection, window.workspace_manager.get_queue_view().clipboard_queue, message);
	},
	move_to_queue_list:function(collection, list_view, message="Moving Content..."){
		var self = this;
		var promise = new Promise(function(resolve, reject){
			self.display_load(message, function(resolve_load, reject_load){
				var reloadCollection = collection.clone();
				collection.move(list_view.model, list_view.model.get("metadata").max_sort_order).then(function(){
					list_view.add_nodes(collection);
					self.reload_ancestors(reloadCollection, false);
					resolve(collection);
					resolve_load(true);
				});
			});
		});
		return promise;
	},
	get_selected:function(){
		var selected_list = [];
		this.lists.forEach(function(list){
			selected_list = $.merge(selected_list, list.get_selected());
		});
		return selected_list;
	}
});

var BaseModalView = BaseView.extend({
  callback:null,
  render: function(closeFunction, renderData) {
    this.$el.html(this.template(renderData));
    $("body").append(this.el);
    this.$(".modal").modal({show: true});
    this.$(".modal").on("hide.bs.modal", closeFunction);
  },
  close: function() {
  	if(this.modal){
  		this.$(".modal").modal('hide');
  	}
    this.remove();
  }
});

var BaseListView = BaseView.extend({
	/* Properties to overwrite */
	collection : null,		//Collection to be used for data
	template:null,
	list_selector:null,
	default_item:null,
	selectedClass: "content-selected",
	item_class_selector:null,

	/* Functions to overwrite */
	create_new_view: null,

	views: [],			//List of item views to help with garbage collection

	bind_list_functions:function(){
		_.bindAll(this, 'load_content', 'handle_if_empty', 'check_all', 'get_selected', 'set_root_model', 'update_views');
	},
	set_root_model:function(model){
		this.model.set(model.toJSON());
	},
	update_views:function(){
		var self = this;
		this.retrieve_nodes(this.model.get("children")).then(function(fetched){
			self.load_content(fetched);
		});
	},
	load_content: function(collection=this.collection, default_text="No items found."){
		this.views = [];
		var default_element = this.$(this.default_item);
		default_element.text(default_text);
		this.$(this.list_selector).html("").append(default_element);
		var self = this;
		collection.forEach(function(entry){
			var item_view = self.create_new_view(entry);
			self.$(self.list_selector).append(item_view.el);
		});
		this.handle_if_empty();
	},
	handle_if_empty:function(){
		this.$(this.default_item).css("display", (this.views.length > 0) ? "none" : "block");
	},
	check_all :function(event){
		var is_checked = event.currentTarget.checked;
		this.$el.find(":checkbox").prop("checked", is_checked);
		(is_checked) ? this.$el.find(this.item_class_selector).addClass(this.selectedClass) : this.$el.find(this.item_class_selector).removeClass(this.selectedClass)
	},
	get_selected: function(){
		var selected_views = [];
		this.views.forEach(function(view){
			if(view.checked){
				selected_views.push(view);
			}
		})
		return selected_views;
	}
});

var BaseEditableListView = BaseListView.extend({
	collection : null,		//Collection to be used for data
	template:null,
	list_selector:null,
	default_item:null,
	selectedClass: "content-selected",
	item_class_selector:null,

	/* Functions to overwrite */
	create_new_view: null,

	views: [],			//List of item views to help with garbage collection
	bind_edit_functions:function(){
		this.bind_list_functions();
		_.bindAll(this, 'create_new_item', 'reset', 'save','delete_items_permanently', 'delete');
	},
	create_new_item: function(newModelData, appendToList = false, message="Creating..."){
		var self = this;
		var promise = new Promise(function(resolve, reject){
			self.display_load(message, function(resolve_load, reject_load){
				self.collection.create(newModelData, {
					success:function(newModel){
						var new_view = self.create_new_view(newModel);
						if(appendToList){
							self.$(self.list_selector).append(new_view.el);
						}
						self.handle_if_empty();
						resolve(new_view);
						resolve_load(true);
					},
					error:function(obj, error){
						console.log("ERROR:", error);
						reject(error);
						reject_load(error);
					}
				});
			});
		});
		return promise;
	},
	reset: function(){
		this.views.forEach(function(entry){
			entry.model.unset();
		});
	},
	save:function(message="Saving...", beforeSave=null){
		var self = this;
	    var promise = new Promise(function(resolve, reject){
	        self.display_load(message, function(load_resolve, load_reject){
					if(beforeSave){
						beforeSave();
					}
		      self.collection.save().then(function(collection){
		          resolve(collection);
		          load_resolve(true);
		      }).catch(function(error){
			    	load_reject(error);
			    });
		    });
	    })
	  	return promise;
	},
	delete_items_permanently:function(message="Deleting"){
		var self = this;
		this.display_load(message, function(resolve_load, reject_load){
			var list = self.get_selected();
			var promise_list = [];
			for(var i = 0; i < list.length; i++){
				var view = list[i];
				if(view){
					promise_list.push(new Promise(function(resolve, reject){
						view.model.destroy({
							success:function(data){
								resolve(data);
							},
							error:function(obj, error){
								reject(error);
							}
						});
						view.remove();
					}));
				}
			}
			Promise.all(promise_list).then(function(){
				self.load_content();
				resolve_load("Success!");
			}).catch(function(error){
				reject_load(error);
			});
		});
	},
	delete:function(view){
      	this.collection.remove(this.view);
      	this.handle_if_empty();
      	// this.update_views();
	}
});

var BaseWorkspaceListView = BaseEditableListView.extend({
	/* Properties to overwrite */
	collection : null,		//Collection to be used for data
	item_view: null,
	template:null,
	list_selector:null,
	default_item:null,
	content_node_view:null,

	/* Functions to overwrite */
	create_new_view:null,

	views: [],			//List of item views to help with garbage collection

	bind_workspace_functions: function(){
		this.bind_edit_functions();
		_.bindAll(this, 'copy_selected', 'delete_selected', 'add_topic','add_nodes', 'drop_in_container','handle_drop', 'refresh_droppable',
			'import_content', 'add_files', 'add_to_clipboard', 'add_to_trash','make_droppable');
	},

	copy_selected:function(){
		var list = this.get_selected();
		var clipboard_list = [];
		var clipboard_root = window.current_user.get_clipboard();
		var copyCollection = new Models.ContentNodeCollection();
		for(var i = 0; i < list.length; i++){
			copyCollection.add(list[i].model);
		}
		return copyCollection.duplicate(clipboard_root);
	},
	delete_selected:function(){
		var list = this.get_selected();
		var deleteCollection = new Models.ContentNodeCollection();
		for(var i = 0; i < list.length; i++){
			var view = list[i];
			if(view){
				deleteCollection.add(view.model);
				view.remove();
			}
		}
		this.add_to_trash(deleteCollection, "Deleting Content...");
	},
	make_droppable:function(){
		var DragHelper = require("edit_channel/utils/drag_drop");
		DragHelper.addSortable(this, this.selectedClass, this.drop_in_container);
	},
	refresh_droppable:function(){
		var self = this;
		setTimeout(function(){
			$( self.list_selector ).sortable( "enable" );
			$( self.list_selector ).sortable( "refresh" );
		}, 100);
	},
	drop_in_container:function(moved_item, selected_items, orders){
		var self = this;
		var promise = new Promise(function(resolve, reject){
	    /* Step 1: Get sort orders updated */
			var max = 1;
			var min = 1;
			var index = orders.indexOf(moved_item);
			var moved_index = selected_items.indexOf(moved_item);
			if(index >= 0){
				var starting_index = index - moved_index - 1;
				var ending_index= starting_index + selected_items.length + 1;
				min = (starting_index < 0)? 0 : orders[starting_index].get("sort_order");
				max = (ending_index >= orders.length)? min + 2 : orders[ending_index].get("sort_order");
				var reload_list = [];
				var last_elem = $("#" + moved_item.id);
				selected_items.forEach(function(node){
					reload_list.push(node.get("id"));
					if(node.get("parent") !== self.model.get("id")){
						reload_list.push(node.get("parent"));
					}
					min = (min + max) / 2;
					node.set({
						"sort_order": min,
						"changed" : true,
						"parent" : self.model.get("id")
					});
					var to_delete = $("#" + node.id);
					var item_view = self.create_new_view(node);
					last_elem.after(item_view.el);
					last_elem = item_view.$el;
					to_delete.remove();
				});
				self.handle_drop(selected_items).then(function(collection){
					collection.save().then(function(savedCollection){
						self.retrieve_nodes($.unique(reload_list), true).then(function(fetched){
							self.reload_ancestors(fetched);
							resolve(true);
						});
					});
				});
			}
		});
		return promise;
	},
	handle_drop:function(collection){
		var promise = new Promise(function(resolve, reject){
			resolve(collection);
		});
		return promise;
  },
	add_nodes:function(collection){
		var self = this;
		collection.sort_by_order();
		collection.forEach(function(entry){
			var new_view = self.create_new_view(entry);
			self.$(self.list_selector).append(new_view.el);
		});
		this.reload_ancestors(collection, false);
		this.handle_if_empty();
	},
	add_topic: function(){
		var UploaderViews = require("edit_channel/uploader/views");
		var self = this;
		var new_topic = this.collection.create({
            "kind":"topic",
            "title": "Topic",
            "sort_order" : this.collection.length,
            "author": window.current_user.get("first_name") + " " + window.current_user.get("last_name")
        }, {
        	success:function(new_topic){
		        var edit_collection = new Models.ContentNodeCollection([new_topic]);
		        $("#main-content-area").append("<div id='dialog'></div>");

		        var metadata_view = new UploaderViews.MetadataModalView({
		            el : $("#dialog"),
		            collection: edit_collection,
		            model: self.model,
		            new_content: true,
		            onsave: self.reload_ancestors,
		            onnew:self.add_nodes
		        });
        	},
        	error:function(obj, error){
            	console.log("Error message:", error);
        	}
        });
	},
	import_content:function(){
		var Import = require("edit_channel/import/views");
      var import_view = new Import.ImportModalView({
          modal: true,
          onimport: this.add_nodes,
          model: this.model
      });
  },
  add_files:function(){
  	var FileUploader = require("edit_channel/file_upload/views");
  	this.file_upload_view = new FileUploader.FileModalView({
      parent_view: this,
      model:this.model,
      onsave: this.reload_ancestors,
	  onnew:this.add_nodes
  	});
  },
  add_to_clipboard:function(collection, message="Moving to Clipboard..."){
  	var self = this;
		this.container.add_to_clipboard(collection, message).then(function(){
			self.handle_if_empty();
		});
	},
	add_to_trash:function(collection, message="Deleting Content..."){
		var self = this;
		this.container.add_to_trash(collection, message).then(function(){
			self.handle_if_empty();
		});
	}
});

var BaseListItemView = BaseView.extend({
	containing_list_view:null,
	template:null,
	id:null,
	className:null,
	model: null,
	tagName: "li",
	selectedClass: null,
	checked : false,

	bind_list_functions:function(){
		_.bindAll(this, 'handle_checked');
	},
	handle_checked:function(){
		this.checked = this.$el.find(">input[type=checkbox]").is(":checked");
		(this.checked)? this.$el.addClass(this.selectedClass) : this.$el.removeClass(this.selectedClass);
	},
});

var BaseListEditableItemView = BaseListItemView.extend({
	containing_list_view:null,
	originalData: null,

	bind_edit_functions:function(){
		_.bindAll(this, 'set','unset','save','delete','reload');
		this.bind_list_functions();
	},
	set:function(data){
		if(this.model){
			this.model.set(data);
		}
	},
	unset:function(){
		this.model.set(this.originalData);
	},
	save:function(data, message="Saving..."){
		var self = this;
		var promise = new Promise(function(resolve, reject){
			self.originalData = data;
			if(self.model.isNew()){
				self.containing_list_view.create_new_item(self.model.attributes).then(function(newModel){
					resolve(newModel);
				}).catch(function(error){
					console.log("ERROR (edit_channel: save):", error);
					reject(error);
				});
			}else{
				self.display_load(message, function(resolve_load, reject_load){
					self.model.save(data,{
						success:function(savedModel){
							resolve(savedModel);
							resolve_load(true);
						},
						error:function(obj, error){
							console.log("ERROR:", error);
							reject(error);
							reject_load(error);
						}
					});
				});
			}
		});
		return promise;
	},
	delete:function(destroy_model, message="Deleting..."){
		this.remove();
		var self = this;
		if(destroy_model){
			this.display_load(message, function(resolve_load, reject_load){
				self.containing_list_view.delete(self);
				self.model.destroy({
					success:function(){
						self.containing_list_view.load_content();
						resolve_load(true);
					},
					error:function(obj, error){
						reject_load(error);
					}
				});
			});
		}
	},
	reload:function(model){
		this.model.set(model.attributes);
		this.render();
	}
});

var BaseListNodeItemView = BaseListEditableItemView.extend({
	containing_list_view:null,
	originalData: null,
	template:null,
	id:null,
	className:null,
	model: null,
	tagName: "li",
	selectedClass: null,
	expandedClass: null,
	collapsedClass: null,

	getToggler: null,
	getSubdirectory: null,
	load_subfiles:null,

	bind_node_functions: function(){
		_.bindAll(this, 'toggle','open_folder','close_folder');
		this.bind_edit_functions();
	},
	toggle:function(event){
		event.stopPropagation();
		event.preventDefault();
		(this.getToggler().hasClass(this.collapsedClass)) ? this.open_folder() : this.close_folder();
		if(this.container){
			var containing_element = this.container.$el.find(this.list_selector);
			containing_element.scrollLeft(containing_element.width());
		}
	},
	open_folder:function(open_speed = 200){
		this.getSubdirectory().slideDown(open_speed);
		if(!this.subcontent_view){
			this.load_subfiles();
		}
		this.getToggler().removeClass(this.collapsedClass).addClass(this.expandedClass);
	},
	close_folder:function(close_speed = 200){
		this.getSubdirectory().slideUp(close_speed);
		this.getToggler().removeClass(this.expandedClass).addClass(this.collapsedClass);
	}
});

var BaseWorkspaceListNodeItemView = BaseListNodeItemView.extend({
	containing_list_view:null,
	originalData: null,
	template:null,
	id:null,
	className:null,
	model: null,
	tagName: "li",
	selectedClass: "content-selected",

	bind_workspace_functions:function(){
		this.bind_node_functions();
		_.bindAll(this, 'open_preview', 'open_edit', 'handle_drop', 'handle_checked', 'add_to_clipboard', 'add_to_trash', 'make_droppable');
	},
	make_droppable:function(){
		if(this.model.get("kind") === "topic"){
			var DragHelper = require("edit_channel/utils/drag_drop");
			DragHelper.addTopicDragDrop(this, this.open_folder, this.handle_drop);
		}
	},
	open_preview:function(){
		var Previewer = require("edit_channel/preview/views");
		$("#main-content-area").append("<div id='dialog'></div>");
		var data={
			el : $("#dialog"),
			model: this.model,
		}
		new Previewer.PreviewModalView(data);
	},
	open_edit:function(event){
		event.stopPropagation();
		event.preventDefault();
		var UploaderViews = require("edit_channel/uploader/views");
		$("#main-content-area").append("<div id='dialog'></div>");
		var editCollection =  new Models.ContentNodeCollection([this.model]);
		var metadata_view = new UploaderViews.MetadataModalView({
			collection: editCollection,
			el: $("#dialog"),
			new_content: false,
			model: this.model,
		  onsave: this.reload_ancestors
		});
	},
	handle_hover:function(event){
		this.hover_open_folder(event);
	},
	handle_drop:function(models){
		var self = this;
		var promise = new Promise(function(resolve, reject){
			var tempCollection = new Models.ContentNodeCollection();
			var sort_order = self.model.get("metadata").max_sort_order;
			var reload_list = [];
	        models.forEach(function(node){
	        	reload_list.push(node.get("parent"));
	        	reload_list.push(node.get("id"));
				node.set({
					parent: self.model.id,
					sort_order: ++sort_order
				});
				tempCollection.add(node);
			});
			tempCollection.save().then(function(savedCollection){
				self.retrieve_nodes(reload_list, true).then(function(fetched){
					self.reload_ancestors(fetched);
					resolve(true);
				});
			});
		});
		return promise;
	},
	add_to_trash:function(message="Deleting Content..."){
		this.containing_list_view.add_to_trash(new Models.ContentNodeCollection([this.model]), message);
		this.remove();
	},
	add_to_clipboard:function(message="Moving to Clipboard..."){
		this.containing_list_view.add_to_clipboard(new Models.ContentNodeCollection([this.model]),message);
	}
});

module.exports = {
	BaseView: BaseView,
	BaseWorkspaceView:BaseWorkspaceView,
	BaseModalView:BaseModalView,
	BaseListView:BaseListView,
	BaseEditableListView:BaseEditableListView,
	BaseWorkspaceListView:BaseWorkspaceListView,
	BaseListItemView:BaseListItemView,
	BaseListNodeItemView:BaseListNodeItemView,
	BaseListEditableItemView: BaseListEditableItemView,
	BaseWorkspaceListNodeItemView:BaseWorkspaceListNodeItemView,
}
