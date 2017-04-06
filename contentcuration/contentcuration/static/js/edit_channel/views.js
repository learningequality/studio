var Backbone = require("backbone");
var _ = require("underscore");
var Models = require("./models");
//var UndoManager = require("backbone-undo");

var BaseView = Backbone.View.extend({
	display_load:function(message, callback){
    	var self = this;
    	if(message.trim()!=""){
    		var load = '<div id="loading_modal" class="text-center fade">' +
            '<div id="kolibri_load_gif"></div>' +
            '<h4 id="kolibri_load_text" class="text-center">' + message + '</h4>' +
            '</div>';
	    	$(load).appendTo('body');
    	}
	    if(callback){
			var promise = new Promise(function(resolve, reject){
				callback(resolve, reject);
			});
			promise.then(function(){
				if(message.trim()!=""){
					$("#loading_modal").remove();
				}
			}).catch(function(error){
				if(message!=""){
					$("#kolibri_load_text").text("Error with asynchronous call. Please refresh the page");
				}
				console.log("Error with asynchronous call", error);
			});
  	}else{
  		$("#loading_modal").remove();
  	}
  },
  	reload_ancestors:function(collection, include_collection){
  		include_collection = include_collection==null || include_collection;
		var list_to_reload = (include_collection) ? collection.pluck("id") : [];
		var self = this;
		collection.forEach(function(entry){
      		$.merge(list_to_reload, entry.get("ancestors"));
		});
		this.retrieve_nodes($.unique(list_to_reload), true).then(function(fetched){
			fetched.forEach(function(model){
				var object = window.workspace_manager.get(model.get("id"));
				if(object){
					if(object.node) object.node.reload(model);
					if(object.list) object.list.set_root_model(model);
				}

				if(model.id === window.current_channel.get("main_tree").id){
					window.current_channel.set('main_tree', model.toJSON());
					self.check_if_published(model);
					window.workspace_manager.get_main_view().handle_checked();
				}
				if(model.id === window.current_user.get('clipboard_tree').id){
					window.current_user.set('clipboard_tree', model.toJSON());
				}
			});
		});
	},
	retrieve_nodes:function(ids, force_fetch){
		force_fetch = (force_fetch)? true:false;
		return window.channel_router.nodeCollection.get_all_fetch(ids, force_fetch);
	},
	fetch_model:function(model){
		return new Promise(function(resolve, reject){
            model.fetch({
                success: resolve,
                error: reject
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
	cancel_actions:function(event){
		event.preventDefault();
		event.stopPropagation();
		if(window.workspace_manager.get_main_view()){
			window.workspace_manager.get_main_view().close_all_popups();
		}
	},
});

var BaseWorkspaceView = BaseView.extend({
	lists: [],
	bind_workspace_functions:function(){
		_.bindAll(this, 'reload_ancestors','publish' , 'edit_permissions', 'handle_published', 'handle_move',
			'edit_selected', 'add_to_trash', 'add_to_clipboard', 'get_selected', 'cancel_actions');
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
	add_to_trash:function(collection, message){
		message = (message!=null)? message: "Deleting Content...";
		return this.move_to_queue_list(collection, window.workspace_manager.get_queue_view().trash_queue, message);
	},
	add_to_clipboard:function(collection, message){
		message = (message!=null)? message: "Moving to Clipboard...";
		return this.move_to_queue_list(collection, window.workspace_manager.get_queue_view().clipboard_queue, message);
	},
	move_to_queue_list:function(collection, list_view, message){
		message = (message!=null)? message: "Moving Content...";
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
	get_selected:function(exclude_descendants){
		var selected_list = [];
		// Use for loop to break if needed
		for(var i = 0; i < this.lists.length; ++i){
			selected_list = $.merge(selected_list, this.lists[i].get_selected());
			if(exclude_descendants && selected_list.length > 0){
				break;
			}
		}
		return selected_list;
	},
	open_archive:function(){
		// var ArchiveView = require("edit_channel/archive/views");
		// var archive = new ArchiveView.ArchiveModalView({
		// 	model : window.current_channel.get_root("trash_tree"),
	 // 	});
	},
	move_content:function(){
		var MoveView = require("edit_channel/move/views");
		var list = this.get_selected(true);
		var move_collection = new Models.ContentNodeCollection(_.pluck(list, 'model'));
		$("#main-content-area").append("<div id='dialog'></div>");

		var move = new MoveView.MoveModalView({
			collection: move_collection,
			el: $("#dialog"),
		    onmove: this.handle_move,
		    model: window.current_channel.get_root("main_tree")
		});
	},
	handle_move:function(target, moved, original_parents){
		// Recalculate counts
		this.reload_ancestors(original_parents, true);

		// Remove where nodes originally were
		moved.forEach(function(node){ window.workspace_manager.remove(node.id)});

		// Add nodes to correct place
		var content = window.workspace_manager.get(target.id);
		if(content && content.list)
			content.list.add_nodes(moved);
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
  },
  closed_modal:function(){
    $("body").addClass('modal-open'); //Make sure modal-open class persists
    $('.modal-backdrop').slice(1).remove();
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
		_.bindAll(this, 'load_content', 'close', 'handle_if_empty', 'check_all', 'get_selected',
			'set_root_model', 'update_views', 'cancel_actions');
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
	load_content: function(collection, default_text){
		collection = (collection)? collection : this.collection;
		default_text = (default_text)? default_text : "No items found."
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
		var is_checked = (event) ? event.currentTarget.checked : true;
		this.$el.find(":checkbox").prop("checked", is_checked);
		this.recurse_check_all(this.views);
	},
	recurse_check_all:function(views){
		var self = this;
		views.forEach(function(view){
			view.handle_checked();
			if(view.subcontent_view){
				self.recurse_check_all(view.subcontent_view.views);
			}
		})
	},
	get_selected: function(){
		var selected_views = [];
		this.views.forEach(function(view){
			if(view.checked){
				selected_views.push(view);
			}else if(view.subcontent_view){
				selected_views = _.union(selected_views, view.subcontent_view.get_selected());
			}
		})
		return selected_views;
	},
	close: function(){
		this.remove();
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
	create_new_item: function(newModelData, appendToList, message){
		appendToList = (appendToList)? appendToList : false;
		message = (message!=null)? message: "Creating...";
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
	save:function(message, beforeSave){
		message = (message!=null)? message: "Saving...";
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
	delete_items_permanently:function(message){
		message = (message!=null)? message: "Deleting...";
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
						self.collection.remove(view.model);
						self.views.splice(view,1);
						view.remove();
					}));
				}
			}
			Promise.all(promise_list).then(function(){
				self.handle_if_empty();
				resolve_load("Success!");
			}).catch(function(error){
				reject_load(error);
			});
		});
	},
	delete:function(view){
      	this.collection.remove(view.model);
      	this.views.splice(view, 1);
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
			'import_content', 'add_files', 'add_to_clipboard', 'add_to_trash','make_droppable', 'copy_collection', 'add_exercise');
	},

	copy_selected:function(){
		var list = this.get_selected();
		var copyCollection = new Models.ContentNodeCollection();
		for(var i = 0; i < list.length; i++){
			copyCollection.add(list[i].model);
		}
		return this.copy_collection(copyCollection);
	},
	copy_collection:function(copyCollection){
		var clipboard = window.workspace_manager.get_queue_view();
		clipboard.switch_to_queue();
		clipboard.open_queue();
		return copyCollection.duplicate(clipboard.clipboard_queue.model);
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
		return new Promise(function(resolve, reject){
			if(_.contains(orders, moved_item)){
				self.handle_drop(selected_items).then(function(collection){
					var ids = collection.pluck('id');
					var pivot = orders.indexOf(moved_item);
					var min = _.chain(orders.slice(0, pivot))
								.reject(function(item) { return _.contains(ids, item.id); })
								.map(function(item) { return item.get('sort_order'); })
								.max().value();
					var max = _.chain(orders.slice(pivot, orders.length))
								.reject(function(item) { return _.contains(ids, item.id); })
								.map(function(item) { return item.get('sort_order'); })
								.min().value();
					min = _.isFinite(min)? min : 0;
					max = _.isFinite(max)? max : min + (selected_items.length * 2);

					var reload_list = [];
					var last_elem = $("#" + moved_item.id);
					collection.forEach(function(node){
						reload_list.push(node.get("id"));
						if(node.get("parent") !== self.model.get("id")){
							reload_list.push(node.get("parent"));
						}
						var to_delete = $("#" + node.id);
						var item_view = self.create_new_view(node);
						last_elem.after(item_view.el);
						last_elem = item_view.$el;
						to_delete.remove();
					});
					collection.move(self.model, max, min).then(function(savedCollection){
						self.retrieve_nodes($.unique(reload_list), true).then(function(fetched){
							self.reload_ancestors(fetched);
							resolve(true);
						});
					}).catch(function(error){
		        		// console.log(error.responseText);
		        		alert(error.responseText);
		        		$(".content-list").sortable( "cancel" );
		        		$(".content-list").sortable( "enable" );
		        		$(".content-list").sortable( "refresh" );

		        		// Revert back to original positions
		        		self.retrieve_nodes($.unique(reload_list), true).then(function(fetched){
							self.reload_ancestors(fetched);
							self.render();
						});
		        	});
				});
			}
		});
	},
	handle_drop:function(collection){
		this.$(this.default_item).css("display", "none");
		var promise = new Promise(function(resolve, reject){
			resolve(collection);
		});
		return promise;
  },
	add_nodes:function(collection){
		var self = this;
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
		            new_topic: true,
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
  add_to_clipboard:function(collection, message){
  	message = (message!=null)? message: "Moving to Clipboard...";
  	var self = this;
		this.container.add_to_clipboard(collection, message).then(function(){
			self.handle_if_empty();
		});
	},
	add_to_trash:function(collection, message){
		message = (message!=null)? message: "Deleting Content...";
		var self = this;
		this.container.add_to_trash(collection, message).then(function(){
			self.handle_if_empty();
		});
	},
	add_exercise:function(){
		var UploaderViews = require("edit_channel/uploader/views");
		var self = this;
		var new_exercise = this.collection.create({
            "kind":"exercise",
            "title": (this.model.get('parent'))? this.model.get('title') + " Exercise" : "Exercise", // Avoid having exercises prefilled with 'email clipboard'
            "sort_order" : this.collection.length,
            "author": window.current_user.get("first_name") + " " + window.current_user.get("last_name"),
            "copyright_holder": window.current_user.get("first_name") + " " + window.current_user.get("last_name")
        }, {
        	success:function(new_node){
		        var edit_collection = new Models.ContentNodeCollection([new_node]);
		        $("#main-content-area").append("<div id='dialog'></div>");

		        var metadata_view = new UploaderViews.MetadataModalView({
		            el : $("#dialog"),
		            collection: edit_collection,
		            model: self.model,
		            new_content: true,
		            new_exercise: true,
		            onsave: self.reload_ancestors,
		            onnew:self.add_nodes
		        });
        	},
        	error:function(obj, error){
            	console.log("Error message:", error);
        	}
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
		_.bindAll(this, 'handle_checked', 'cancel_actions');
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
	save:function(data, message){
		message = (message!=null)? message: "Saving...";
		var self = this;
		var promise = new Promise(function(resolve, reject){
			self.originalData = data;
			if(self.model.isNew()){
				self.containing_list_view.create_new_item(data).then(function(newView){
					resolve(newView.model);
				}).catch(function(error){
					console.log("ERROR (edit_channel: save):", error);
					reject(error);
				});
			}else{
				self.display_load(message, function(resolve_load, reject_load){
					self.model.save(data,{
						patch:true,
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
	delete:function(destroy_model, message){
		message = (message!=null)? message: "Deleting...";
		this.remove();
		var self = this;
		if(destroy_model){
			this.display_load(message, function(resolve_load, reject_load){
				self.containing_list_view.delete(self);
				self.model.destroy({
					success:function(){
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
		this.cancel_actions(event);
		(this.getToggler().hasClass(this.collapsedClass)) ? this.open_folder() : this.close_folder();
		if(this.container){
			var containing_element = this.container.$el.find(this.list_selector);
			containing_element.scrollLeft(containing_element.width());
		}
	},
	open_folder:function(open_speed){
		open_speed = (open_speed)? open_speed: 200;
		this.getSubdirectory().slideDown(open_speed);
		if(!this.subcontent_view){
			this.load_subfiles();
		}
		this.getToggler().removeClass(this.collapsedClass).addClass(this.expandedClass);
	},
	close_folder:function(close_speed){
		close_speed = (close_speed)? close_speed: 200;
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
		_.bindAll(this, 'copy_item', 'open_preview', 'open_edit', 'handle_drop',
			'handle_checked', 'add_to_clipboard', 'add_to_trash', 'make_droppable',
			'add_nodes', 'add_topic', 'open_move', 'handle_move');
	},
	make_droppable:function(){
		// Temporarily disable dropping onto topics for now
		// if(this.model.get("kind") === "topic"){
		// 	var DragHelper = require("edit_channel/utils/drag_drop");
		// 	DragHelper.addTopicDragDrop(this, this.open_folder, this.handle_drop);
		// }
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
	open_move:function(){
		var MoveView = require("edit_channel/move/views");
		var move_collection = new Models.ContentNodeCollection();
		move_collection.add(this.model);
		$("#main-content-area").append("<div id='dialog'></div>");
		new MoveView.MoveModalView({
			collection: move_collection,
			el: $("#dialog"),
		    onmove: this.handle_move,
		    model: window.current_channel.get_root("main_tree")
		});
	},
	handle_move:function(target, moved, original_parents){
		// Recalculate counts
		this.reload_ancestors(original_parents, true);

		// Remove where node originally was
		window.workspace_manager.remove(this.model.id)

		// Add nodes to correct place
		var content = window.workspace_manager.get(target.id);
		if(content && content.list){
			content.list.add_nodes(moved);
		}
	},
	open_edit:function(allow_edit){
		var UploaderViews = require("edit_channel/uploader/views");
		$("#main-content-area").append("<div id='dialog'></div>");
		var editCollection =  new Models.ContentNodeCollection([this.model]);
		var metadata_view = new UploaderViews.MetadataModalView({
			collection: editCollection,
			el: $("#dialog"),
			new_content: false,
			model: this.containing_list_view.model,
		  	onsave: this.reload_ancestors,
		  	allow_edit: allow_edit
		});
	},
	handle_drop:function(models){
		var self = this;
		var promise = new Promise(function(resolve, reject){
			var tempCollection = new Models.ContentNodeCollection();
			var sort_order = self.model.get("metadata").max_sort_order;
			var reload_list = [self.model.get("id")];
	        models.forEach(function(node){
	        	reload_list.push(node.get("parent"));
	        	reload_list.push(node.get("id"));
				node.set({
					sort_order: ++sort_order
				});
				tempCollection.add(node);
			});
			tempCollection.move(self.model.id).then(function(savedCollection){
				self.retrieve_nodes(reload_list, true).then(function(fetched){
					self.reload_ancestors(fetched);
					resolve(true);
				});
			});
		});
		return promise;
	},
	add_to_trash:function(message){
		message=(message!=null)? message: "Deleting Content...";
		this.containing_list_view.add_to_trash(new Models.ContentNodeCollection([this.model]), message);
		this.remove();
	},
	add_to_clipboard:function(message){
		message=(message!=null)? message: "Moving to Clipboard...";
		this.containing_list_view.add_to_clipboard(new Models.ContentNodeCollection([this.model]),message);
	},
	copy_item:function(message){
		message=(message!=null)? message: "Copying to Clipboard...";
		var copyCollection = new Models.ContentNodeCollection();
		copyCollection.add(this.model);
		var self = this;
		this.display_load(message, function(resolve, reject){
			self.containing_list_view.copy_collection(copyCollection).then(function(collection){
				self.containing_list_view.add_to_clipboard(collection, "");
				resolve(collection);
			});
		});
	},
	add_topic: function(){
		var UploaderViews = require("edit_channel/uploader/views");
		var self = this;
		var new_topic = new Models.ContentNodeModel();
        new_topic.save({
            "kind":"topic",
            "title": "Topic",
            "sort_order" : this.model.get("metadata").max_sort_order,
            "author": window.current_user.get("first_name") + " " + window.current_user.get("last_name")
        },{
        	success:function(new_topic){
		        var edit_collection = new Models.ContentNodeCollection([new_topic]);
		        $("#main-content-area").append("<div id='dialog'></div>");

		        var metadata_view = new UploaderViews.MetadataModalView({
		            el : $("#dialog"),
		            collection: edit_collection,
		            model: self.model,
		            new_content: true,
		            new_topic: true,
		            onsave: self.reload_ancestors,
		            onnew:self.add_nodes
		        });
        	},
        	error:function(obj, error){
            	console.log("Error message:", error);
        	}
        });
	},
	add_nodes:function(collection){
		var self = this;
		if(this.subcontent_view){
			this.subcontent_view.add_nodes(collection);
		}else{
			this.fetch_model(this.model).then(function(fetched){
				self.reload(fetched);
			});
		}
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