var Backbone = require("backbone");
var _ = require("underscore");
var Models = require("./models");
//var UndoManager = require("backbone-undo");

var BaseView = Backbone.View.extend({
	list_index : 0,
	undo_manager: null,
	queue_view: null,
	set_editing: function(edit_mode_on){
		$(".disable-on-edit").prop("disabled", edit_mode_on);
		$(".disable-on-edit").css("cursor", (edit_mode_on) ? "not-allowed" : "pointer");
		$(".invisible-on-edit").css('visibility', (edit_mode_on)?'hidden' : 'visible');
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
		    onsave: this.reload_listed
		});
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
    },
	add_to_trash:function(collection, resolve, reject){
		//OVERWRITE IN SUBCLASSES
	},
	add_to_clipboard:function(collection, resolve, reject){
		//OVERWRITE IN SUBCLASSES
	},
	reload_listed:function(collection, resolve, reject){
		var list_to_reload = [];
		var promises = [];
        collection.forEach(function(entry){
        	$.merge(list_to_reload, entry.get("ancestors"));
		});
		$.unique(list_to_reload).forEach(function(id){
			if($("#" + id) && $("#" + id).data("data")){
				promises.push(new Promise(function(resolve1, reject1){
					$("#" + id).data("data").reload(resolve1, reject1);
				}));
        	}
		});
		Promise.all(promises).then(function(){
			resolve(true);
		})
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
	}
});

BaseListView = BaseView.extend({
	views: [],			//List of item views to help with garbage collection
	collection : null,		//Collection to be used for data
	allow_edit: false,
	item_view: null, // Use to determine how to save, delete, update files
	reset: function(){
		this.views.forEach(function(entry){
			entry.model.unset();
		});
	},
	copy_selected:function(resolve, reject){
		var list = this.$el.find('input:checked').parent("li");
		var clipboard_list = [];
		var clipboard_root = window.current_user.get_clipboard();
		var copyCollection = new Models.ContentNodeCollection();
		for(var i = 0; i < list.length; i++){
			copyCollection.add($(list[i]).data("data").model);//.duplicate(clipboard_root, null);
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
	drop_in_container:function(moved_item, selected_items, orders, resolve, reject){
		var self = this;
        /* Step 1: Get sort orders updated */
			var max = 1;
			var min = 1;
			var index = orders.indexOf(moved_item);
			if(index >= 0){
				min = (index === 0)? 0 : orders.at(index - 1).get("sort_order");
				max = (index === orders.length - 1)? min + 2 : orders.at(index + 1).get("sort_order");
				var updated_collection = new Models.ContentNodeCollection();
				selected_items.forEach(function(node){
					min = (min + max) / 2;
					node.set({
						"sort_order": min,
						"changed" : true
					});
					updated_collection.push(node.clone());
				});
				selected_items = updated_collection;
			}else{
				resolve_main("Success!");
			}
		/* Step 2: Handle nodes from another parent if needed */
			var promise = new Promise(function(resolve1, reject1){
				if(orders.findWhere({id: moved_item.id})){
					self.handle_transfer_drop(selected_items, resolve1, reject1);
				}
			});
			promise.then(function(collections){
				selected_items = collections.collection;
				original_parents = collections.original_parents;
		/* Step 3: Save nodes */
				var second_promise = new Promise(function(resolve2, reject2){
					selected_items.save(resolve2, reject2);
				});
				second_promise.then(function(){
		/* Step 4: Add items to show where items are dropped */
		 			var promises = [];
			 		var last_elem = $("#" + moved_item.id);
					selected_items.forEach(function(node){
						promises.push(new Promise(function(resolve3, reject3){
								var to_delete = $("#" + node.id);
								var item_view = self.create_new_item(node, resolve3, reject3);
								last_elem.after(item_view.el);
								last_elem = item_view.$el;
								self.views.push(item_view);
								to_delete.remove();
							}));
					});
		/* Step 5: Once all items have been created, reload page to reflect changes */
					Promise.all(promises).then(function(){
						var reload_list = new Models.ContentNodeCollection(reload_list);
						reload_list.add(original_parents.models.concat(selected_items.models));
						var promise = new Promise(function(resolve1, reject1){
				            self.reload_listed(reload_list, resolve1, reject1);
				        });
				        promise.then(function(){
							resolve();
				        });
					});
		/* Catch any errors */
				});
			});
	},

	remove_view: function(view){
		this.views.splice(this.views.indexOf(this), 1);
		view.remove();
	},
	add_nodes:function(collection, resolve, reject){
		var self = this;
		var promise = new Promise(function(resolve1, reject1){
			collection.move(self.model, self.model.get("metadata").max_sort_order, resolve1, reject1);
		});
		promise.then(function(){
			collection.add(self.model);
			var promise1 = new Promise(function(resolve2, reject2){
				self.reload_listed(collection, resolve2, reject2);
			});
			promise1.then(function(){
				self.list_index = collection.length;
				self.render();
				resolve(collection);
			})

		});
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
            model:this.model
    	})
    },
    assign_indices:function(){
    	var self = this;
    	this.views = [];
    	this.$el.find("." + this.item_class).each(function(index, item){
    		var view = $(item).data("data");
    		view.index = index;
    		self.views.push(view);
    		self.list_index = index + 1;
    	});
    },
    handle_transfer_drop:function(transfer_collection, resolve, reject){
		var self = this;
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
			updated_collection.push(node.clone());
		});
		original_parents = original_parents.get_all_fetch(fetch_collection);
		resolve({"collection" : updated_collection,
				"original_parents" : original_parents});
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
	set_editing: function(edit_mode_on){
		this.containing_list_view.set_editing(edit_mode_on);
	},
	remove_item:function(){
		this.containing_list_view.remove_view(this);
	}
});

var BaseListNodeItemView = BaseListItemView.extend({
	selectedClass: null,
	reload:function(resolve, reject){
		var self = this;
		this.model.fetch({
			success:function(model){
				self.render(resolve, reject);
			},
			error:function(obj, error){
				reject(error);
			}
		});
	},
	delete:function(){
    	if(!this.model){
    		this.remove();
    	}
		if(this.containing_list_view.item_view != "uploading_content"){
			this.add_to_trash();
		}
	},
	// save: function(data, options){
 //    	if(!this.model){
 //    		var node_data = new Models.ContentNodeModel(data);
	// 		this.containing_list_view.collection.create(node_data, options);
	// 		if(this.model.get("kind").toLowerCase() != "topic"){
	// 			node_data.create_file();
	// 		}
 //    	}
	// 	else{
	// 		this.model.save(data, options);
	// 		if(this.model.get("kind") && this.model.get("kind").toLowerCase() != "topic"){
	// 			this.model.create_file();
	// 		}
	// 	}
	// },
	// set:function(data, options){
	// 	if(!this.model){
 //    		var node_data = new Models.ContentNodeModel(data);
	// 		this.containing_list_view.collection.create(node_data, options);
	// 		if(this.model.get("kind").toLowerCase() != "topic"){
	// 			node_data.create_file();
	// 		}
 //    	}else{
 //    		this.model.set(data, options);
 //    	}
	// },
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
	handle_edit_submit:function(collection, resolve, reload){
		this.reload(resolve, reload);
	},
	handle_hover:function(event){
		this.hover_open_folder(event);
	},
	handle_drop:function(models, enable_function){
		var self = this;
		var tempCollection = new Models.ContentNodeCollection();
		var sort_order = this.model.get("metadata").max_sort_order;
		var reload_list = [];

		this.display_load("Moving Content...", function(resolve, reject){
            models.forEach(function(node){
				node.set({
					parent: self.model.id,
					sort_order: ++sort_order
				});
				tempCollection.add(node);
			});
			var promise = new Promise(function(resolve1, reject1){
				tempCollection.save(resolve1, reject1);
			});
			promise.then(function(){
				self.reload(resolve, reject);
				enable_function();
			}).catch(function(error){
				self.containing_list_view.render(resolve, reject);
				enable_function();
			});
        });
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

var BaseListChannelItemView = BaseListItemView.extend({
	delete:function(){
		if(!this.model){
    		this.remove();
	    }else{
	    	this.model.save({"deleted":true});
	    	this.remove();
	    }
	},
	save: function(data, options){
    	if(!this.model){
    		this.model = new Models.ChannelModel(data);
    		this.containing_list_view.collection.create(this.model, options);
    	}else{
    		this.model.save(data, options);
    	}
	}
});

var BaseModalView = BaseView.extend({
    callback:null,
    close: function() {
    	if(this.modal){
    		this.$(".modal").modal('hide');
    	}

        this.remove();
    }
});

module.exports = {
	BaseView: BaseView,
	BaseListView:BaseListView,
	BaseListItemView:BaseListItemView,
	BaseListChannelItemView: BaseListChannelItemView,
	BaseListNodeItemView:BaseListNodeItemView,
	BaseModalView:BaseModalView
}
