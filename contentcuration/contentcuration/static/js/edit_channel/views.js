var Backbone = require("backbone");
var _ = require("underscore");
var Models = require("./models");
//var UndoManager = require("backbone-undo");

var BaseView = Backbone.View.extend({
	render:function(renderData){
		this.$el.html(this.template(renderData));
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
	}
});

BaseListView = BaseView.extend({
	views: [],			//List of item views to help with garbage collection
	collection : null,		//Collection to be used for data

	/* Functions to overwrite */

	render:function(renderData){
		this.$el.html(this.template(renderData));
		this.load_content();
	}


    load_content:function(){
        var self = this;
        this.collection.forEach(function(entry){
            var item_view = new ImportItem({
                containing_list_view: self,
                model: entry,
                is_channel : self.is_channel,
                selected: (self.parent_node_view)? self.parent_node_view.selected : false,
            });
            self.$el.find(".import-list").first().append(item_view.el);
            self.views.push(item_view);
        });
    },
    check_all_items:function(checked){
        this.views.forEach(function(entry){
            entry.check_item(checked);
            entry.set_disabled(checked);
            if(entry.subcontent_view){
                entry.subcontent_view.check_all_items(checked);
            }

        });
    },
    update_count:function(){
        if(this.parent_node_view){
            this.parent_node_view.update_count();
        }else{
            this.container.update_count();
        }
    },
    get_metadata:function(){
        var self = this;
        this.metadata = {"count" : 0, "size":0};
        this.views.forEach(function(entry){
            self.metadata.count += entry.metadata.count;
            self.metadata.size += entry.metadata.size;
        });
        return this.metadata;
    }





    load_content:function(){
        var self = this;
        this.collection.forEach(function(entry){
            var export_item = new ExportItem({
                model: entry,
                containing_list_view : self
            });
            self.$("#export_list_" + self.model.get("id")).append(export_item.el);
            self.views.push(export_item);
        });
        if(this.collection.length ==0){
            this.$("#export_list_" + self.model.get("id")).append("<em>No files found.</em>");
        }
    }





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
			self.add_nodes(collection, resolve, reject);
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

BaseWorkspaceListView = BaseListView.extend({
	views: [],			//List of item views to help with garbage collection
	collection : null,		//Collection to be used for data
	item_view: null,

	/* Functions to overwrite */
	_mapping:null,
	create_new_item:null,

	bind_edit_functions: function(){
		console.log("binding:", this);
		_.bindAll(this, '_mapping', 'add_topic','add_nodes', 'create_new_item', 'drop_in_container','handle_transfer_drop');
	},

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
							var item_view = self.create_new_item(node);
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
			self.create_new_item(entry);
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
    	})
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

	remove_item:function(){
		this.containing_list_view.remove_view(this);
	}
});

var BaseListNodeItemView = BaseListItemView.extend({
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
	},
	set_editing: function(edit_mode_on){
		this.containing_list_view.set_editing(edit_mode_on);
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

module.exports = {
	BaseView: BaseView,
	BaseListView:BaseListView,
	BaseWorkspaceListView:BaseWorkspaceListView,
	BaseListItemView:BaseListItemView,
	BaseListChannelItemView: BaseListChannelItemView,
	BaseListNodeItemView:BaseListNodeItemView,
	BaseModalView:BaseModalView
}
