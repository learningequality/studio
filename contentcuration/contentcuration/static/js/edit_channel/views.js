var Backbone = require("backbone");
var _ = require("underscore");
var Models = require("./models");
//var UndoManager = require("backbone-undo");

var BaseView = Backbone.View.extend({
	render:function(renderData){
		this.$el.html(this.template(renderData));
	},
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
		}).catch(function(error){
			$("#kolibri_load_text").text("Error with asychronous call. Please refresh the page");
			console.log("Error with asychronous call", error);
		});
  	}else{
  		$("#loading_modal").remove();
  	}
  }
});

var BaseWorkspaceView = BaseView.extend({
	bind_workspace_functions:function(){
		_.bindAll(this, 'reload_ancestors','publish' , 'edit_permissions', 'edit_selected', 'add_to_trash', 'add_to_clipboard');
	},
	reload_ancestors:function(collection, include_collection = true, callback=null){
		var list_to_reload = (include_collection) ? collection.pluck("id") : [];
		collection.forEach(function(entry){
        	$.merge(list_to_reload, entry.get("ancestors"));
		});

		collection.get_all_fetch($.unique(list_to_reload)).then(function(fetched){
			fetched.forEach(function(model){
				var element = $("#" + model.get("id"));
				if(element && element.data("data")){
					element.data("data").reload(model);
	        	}
	        	if(callback){
	        		callback(true);
	        	}
			});
		});
	},
	publish:function(){
		var self = this;
		var Exporter = require("edit_channel/export/views");
		var exporter = new Exporter.ExportModalView({
			model: window.current_channel.get_root("main_tree"),
			callback: function(){
				var list = $(".to_publish");
				list.each(function(index, entry){
					$(entry).data("data").reload();
				});
			}
		});
	},
	edit_permissions:function(){
		var share_view = new ShareViews.ShareModalView({
			model:window.current_channel,
			current_user: window.current_user.toJSON()
		});
	},
	get_queue:function(){
		return $("#queue").data("data");
	},
	edit_selected:function(){
		var UploaderViews = require("edit_channel/uploader/views");
		var list = this.$el.find('input:checked').parent("li");
		var edit_collection = new Models.ContentNodeCollection();
		/* Create list of nodes to edit */
		for(var i = 0; i < list.length; i++){
			var model = $(list[i]).data("data").model;
			model.view = $(list[i]).data("data");
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
	add_to_trash:function(collection, resolve, reject){
		//OVERWRITE IN SUBCLASSES
	},
	add_to_clipboard:function(collection, resolve, reject){
		//OVERWRITE IN SUBCLASSES
	},
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
	views: [],			//List of item views to help with garbage collection

	/* Functions to overwrite */
	handle_if_empty:null,
	create_new_view: null,
	list_selector:null,
	default_item:null,

	bind_list_functions:function(){
		_.bindAll(this, 'load_content', 'handle_if_empty');
	},
	render:function(renderData){
		this.$el.html(this.template(renderData));
		this.load_content();
	},
	load_content: function(collection=this.collection){
		this.views = [];
		this.$(this.list_selector).html("");
		var self = this;
		collection.forEach(function(entry){
			var item_view = self.create_new_view(entry);
			self.$(self.list_selector).append(item_view.el);
		});
		this.handle_if_empty();
	},
	handle_if_empty:function(){
		this.$(this.default_item).css("display", (this.views.length > 0) ? "none" : "block");
	}
});

var BaseEditableListView = BaseListView.extend({
	create_new_view:null,
	bind_edit_functions:function(){
		this.bind_list_functions();
		_.bindAll(this, 'create_new_item', 'reset');
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
});

var BaseWorkspaceListView = BaseEditableListView.extend({
	/* Properties to overwrite */
	collection : null,		//Collection to be used for data
	item_view: null,
	template:null,

	/* Functions to overwrite */
	_mapping:null,
	create_new_view:null,

	views: [],			//List of item views to help with garbage collection

	bind_workspace_functions: function(){
		this.bind_edit_functions();
		_.bindAll(this, 'copy_selected', 'delete_selected', 'add_topic','add_nodes', 'drop_in_container','handle_transfer_drop',
			'remove_view', 'import_content', 'import_nodes', 'add_files', 'add_to_clipboard', 'add_to_trash');
	},
	copy_selected:function(resolve, reject){
		var list = this.$el.find('input:checked').parent("li");
		var clipboard_list = [];
		var clipboard_root = window.current_user.get_clipboard();
		var copyCollection = new Models.ContentNodeCollection();
		for(var i = 0; i < list.length; i++){
			copyCollection.add($(list[i]).data("data").model);
		}
		var self = this;

        var promise = new Promise(function(resolve1, reject1){
            copyCollection.duplicate(clipboard_root, resolve1, reject1);
        });
        promise.then(function(collection){
            self.add_to_clipboard(collection, resolve, reject);
        }).catch(function(error){
            reject(error);
        });
	},
	delete_selected:function(resolve, reject){
		var list = this.$el.find('input:checked').parent("li");
		var deleteCollection = new Models.ContentNodeCollection();
		for(var i = 0; i < list.length; i++){
			var view = $("#" + list[i].id).data("data");
			deleteCollection.add(view.model);
			view.remove();
		}
		this.add_to_trash(deleteCollection, resolve, reject);
	},
	drop_in_container:function(moved_item, selected_items, orders){
		var self = this;
		var promise = new Promise(function(resolve, reject){
			// var original_parents = selected_items.pluck("parent");
	        /* Step 1: Get sort orders updated */
			var max = 1;
			var min = 1;
			var index = orders.indexOf(moved_item);
			if(index >= 0){
				min = (index === 0)? 0 : orders.at(index - 1).get("sort_order");
				max = (index === orders.length - 1)? min + 2 : orders.at(index + 1).get("sort_order");

				selected_items.forEach(function(node){
					min = (min + max) / 2;
					node.set({
						"sort_order": min,
						"changed" : true
					});
				});
			//  Step 2: Handle nodes from another parent if needed
				self.handle_transfer_drop(selected_items).then(function(collections){
					var original_parents = collections.original_parents;
			/* Step 3: Save nodes */
					collections.collection.save().then(function(savedCollection){
						console.log("SAVED:", savedCollection);
				 		var last_elem = $("#" + moved_item.id);
						savedCollection.forEach(function(node){
							var to_delete = $("#" + node.id);
							var item_view = self.create_new_view(node);
							last_elem.after(item_view.el);
							last_elem = item_view.$el;
							to_delete.remove();
						});
			/* Step 5: Once all items have been created, reload page to reflect changes */
						var reload_list = new Models.ContentNodeCollection();
						reload_list.add(original_parents.models.concat(savedCollection.models));
						self.reload_ancestors(reload_list, false);
						resolve(true);
					});
				});
			}else{
				resolve(false);
			}
		});
		return promise;
	},
	handle_transfer_drop:function(transfer_collection){
		var self = this;
		var promise = new Promise(function(resolve, reject){
			var original_parents = new Models.ContentNodeCollection();
			var fetch_collection = [];
			var updated_collection = new Models.ContentNodeCollection();
			transfer_collection.forEach(function(node){
				if(node.get("parent") != self.model.id){
					if(fetch_collection.indexOf(node.get("parent")) < 0){
						fetch_collection.push(node.get("parent"));
					}
					node.set("parent", self.model.id);
				}
				updated_collection.push(node);
			});
			console.log("READY:", updated_collection);
			original_parents.get_all_fetch(fetch_collection).then(function(originalParents){
				resolve({"collection" : updated_collection,
					"original_parents" : original_parents});
			});
		});
		return promise;
    },
	remove_view: function(view){
		this.views.splice(this.views.indexOf(this), 1);
		view.remove();
	},
	add_nodes:function(collection){
		var self = this;
		collection.sort_by_order();
		collection.forEach(function(entry){
			self.create_new_view(entry);
		});
		this.render_views();
		this.reload_ancestors(collection, false);
	},
	add_topic: function(event){
		var UploaderViews = require("edit_channel/uploader/views");
		var self = this;
		var new_topic = this.collection.create({
            "kind":"topic",
            "title": "Topic",
            "sort_order" : this.collection.length,
            "author": window.current_user.get("first_name") + " " + window.current_user.get("last_name")
        }, {
        	success:function(new_topic){
        		new_topic.set({
		            "original_node" : new_topic.get("id"),
		            "cloned_source" : new_topic.get("id")
		        });
		        var edit_collection = new Models.ContentNodeCollection([new_topic]);
		        $("#main-content-area").append("<div id='dialog'></div>");

		        var metadata_view = new UploaderViews.MetadataModalView({
		            el : $("#dialog"),
		            collection: edit_collection,
		            model: self.model,
		            new_content: true,
		            onsave: self.add_nodes
		        });
        	},
        	error:function(obj, error){
        		console.log("Error creating topic", obj);
                console.log("Error message:", error);
                console.trace();
        	}
        });
	},
	import_content:function(){
		var Import = require("edit_channel/import/views");
      var import_view = new Import.ImportModalView({
          modal: true,
          callback: this.import_nodes,
          model: this.model
      });
  },
  import_nodes:function(collection){
    this.reload_listed(collection);
    this.render();
  },
  add_files:function(){
  	var FileUploader = require("edit_channel/file_upload/views");
  	this.file_upload_view = new FileUploader.FileModalView({
      parent_view: this,
      model:this.model,
      onsave: this.add_nodes
  	});
  },
  assign_indices:function(){
  	var self = this;
  	this.views = [];
  	this.$el.find("." + this.item_class).each(function(index, item){
  		var view = $(item).data("data");
  		view.index = index;
  		self.views.push(view);
  	});
  },
  add_to_clipboard:function(collection, resolve, reject){
		this.container.add_to_clipboard(collection, resolve, reject);
	},
	add_to_trash:function(collection, resolve, reject){
		this.container.add_to_trash(collection, resolve, reject);
	}
});


var BaseListItemView = BaseView.extend({
	containing_list_view:null,
	originalData: null,
	template:null,
	id:null,
	className:null,
	model: null,
});

var BaseListEditableItemView = BaseView.extend({
	containing_list_view:null,
	originalData: null,

	bind_edit_functions:function(){
		_.bindAll(this, 'set','unset','save','delete');
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


    // toggle_subfiles:function(event){
    //     event.stopPropagation();
    //     event.preventDefault();
    //     var el =  this.$el.find("#menu_toggle_" + this.model.id);
    //     if(!this.export_view){
    //         this.export_view = new ExportListView({
    //             el: this.$("#export_item_" + this.model.get("id") + "_sub"),
    //             container: this,
    //             model: this.model
    //         });
    //     }
    //     if(el.hasClass("glyphicon-menu-right")){
    //         this.$("#export_item_" + this.model.get("id") + "_sub").slideDown();
    //         el.removeClass("glyphicon-menu-right").addClass("glyphicon-menu-down");
    //     }else{
    //         this.$("#export_item_" + this.model.get("id") + "_sub").slideUp();
    //         el.removeClass("glyphicon-menu-down").addClass("glyphicon-menu-right");
    //     }
    // }
});

var BaseListNodeItemView = BaseListEditableItemView.extend({
	selectedClass: null,
	reload:function(model){
		this.model = model;
		this.render();
	},
	delete:function(){
		console.log("CALLED HERE!");
    	if(!this.model){
    		this.remove();
    	}
		if(this.containing_list_view.item_view != "uploading_content"){
			this.add_to_trash();
		}
	},
	edit_item: function(event){
		event.preventDefault();
		event.stopPropagation();
		this.open_edit();
	},
	open_edit:function(){
		var UploaderViews = require("edit_channel/uploader/views");

		$("#main-content-area").append("<div id='dialog'></div>");
		var editCollection =  new Models.ContentNodeCollection([this.model]);
		var metadata_view = new UploaderViews.MetadataModalView({
			collection: editCollection,
			el: $("#dialog"),
			new_content: false,
			model: this.model,
		    onsave: this.handle_edit_submit
		});
	},
	handle_edit_submit:function(collection){
		this.model = collection.pop();
		console.log(this.model);
		this.render();
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
				node.set({
					parent: self.model.id,
					sort_order: ++sort_order
				});
				tempCollection.add(node);
			});
			tempCollection.save().then(function(savedCollection){
				self.model.fetch({
					success:function(fetched){
						self.reload(fetched);
						resolve(fetched);
					}
				});
			});
		});
		return promise;
	},
	add_to_trash:function(resolve, reject){
		this.containing_list_view.add_to_trash(new Models.ContentNodeCollection([self.model]), resolve, reject);
		this.remove();
	},
	add_to_clipboard:function(resolve, reject){
		this.containing_list_view.add_to_clipboard(new Models.ContentNodeCollection([self.model], resolve, reject));
	},
	handle_checked:function(){
		(this.$el.find(">input[type=checkbox]").is(":checked"))? this.$el.addClass(this.selectedClass) : this.$el.removeClass(this.selectedClass);
	},
});




module.exports = {
	BaseView: BaseView,
	BaseWorkspaceView:BaseWorkspaceView,
	BaseModalView:BaseModalView,
	BaseListView:BaseListView,
	BaseEditableListView:BaseEditableListView,
	BaseWorkspaceListView:BaseWorkspaceListView,
	BaseListItemView:BaseListItemView,
	BaseListEditableItemView: BaseListEditableItemView,
	BaseListNodeItemView:BaseListNodeItemView,
}
