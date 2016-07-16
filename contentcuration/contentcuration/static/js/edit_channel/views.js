var Backbone = require("backbone");
var _ = require("underscore");
var Models = require("./models");
//var UndoManager = require("backbone-undo");

var BaseView = Backbone.View.extend({
	list_index : 0,
	undo_manager: null,
	queue_view: null,
	delete_view: function(){
		this.remove();
	},
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

		var metadata_view = new UploaderViews.EditMetadataView({
			collection: edit_collection,
			parent_view: this,
			el: $("#dialog"),
			allow_add : false,
			main_collection: this.collection,
			modal:true,
			model: content
		});
	},
	add_to_view:function(){
		var UploaderViews = require("edit_channel/uploader/views");
		$("#main-content-area").append("<div id='dialog'></div>");
		var new_collection = new Models.ContentNodeCollection();
		var add_view = new UploaderViews.AddContentView({
			el : $("#dialog"),
			collection: new_collection,
			main_collection: this.collection,
			parent_view: this,
			model: this.model,
			modal:true
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
    		setTimeout(function(){
    			try{
    				callback();
    				$("#loading_modal").remove();
    			}catch(err){
    				$("#kolibri_load_text").text(err + ". Please refresh the page");
    			}
			 }, 800);
    	}else{
    		$("#loading_modal").remove();
    	}
    },
	add_to_trash:function(collection){
		//OVERWRITE IN SUBCLASSES
	},
	add_to_clipboard:function(collection){
		//OVERWRITE IN SUBCLASSES
	},
	undo: function() {
        this.undo_manager.undo();
    },
    redo: function() {
        this.undo_manager.redo();
    },
    save:function(){
		this.collection.save();
	},
	update_word_count:function(input, counter, limit){
		var char_length = limit - input.val().length;
		if(input.val().trim() == ""){
			char_length = limit;
		}
	    counter.html(char_length + ((char_length  == 1) ? " char left" : " chars left"));
	    counter.css("color", (char_length == 0)? "red" : "gray");
	},
	reload_listed:function(collection){
		var list_to_reload = [];
        collection.forEach(function(entry){
        	$.merge(list_to_reload, entry.get("ancestors"));
		});
		$.unique(list_to_reload).forEach(function(id){
			if($("#" + id) && $("#" + id).data("data")){
        		$("#" + id).data("data").reload();
        	}
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
	}
});

BaseListView = BaseView.extend({
	views: [],			//List of item views to help with garbage collection
	collection : null,		//Collection to be used for data
	allow_edit: false,
	item_view: null, // Use to determine how to save, delete, update files

	set_editing: function(edit_mode_on){
		this.allow_edit = !edit_mode_on;
		$(".disable-on-edit").prop("disabled", edit_mode_on);
		$(".disable-on-edit").css("cursor", (edit_mode_on) ? "not-allowed" : "pointer");
		$(".invisible-on-edit").css('visibility', (edit_mode_on)?'hidden' : 'visible');
	},

	reset: function(){
		this.views.forEach(function(entry){
			entry.model.unset();
		});
	},
	set_sort_orders: function(collection){
		var index = 1;
		views.forEach(function(entry){
			entry.set({'sort_order' : ++index}, {validate: false});
		});
	},
	copy_selected:function(){
		var list = this.$el.find('input:checked').parent("li");
		var clipboard_list = [];
		var clipboard_root = window.current_channel.get_root("clipboard_tree");
		var copyCollection = new Models.ContentNodeCollection();
		for(var i = 0; i < list.length; i++){
			copyCollection.add($(list[i]).data("data").model);//.duplicate(clipboard_root, null);
		}
		var copiedCollection = copyCollection.duplicate(clipboard_root, null);
		this.add_to_clipboard(copiedCollection);
		return this.$el.find(".current_topic input:checked").length != 0;
	},
	delete_selected:function(){
		var list = this.$el.find('input:checked').parent("li");
		var stopLoop = this.$el.find(".current_topic input").is(":checked");
		var deleteCollection = new Models.ContentNodeCollection();
		for(var i = 0; i < list.length; i++){
			var view = $("#" + list[i].id).data("data");
			deleteCollection.add(view.model);
			view.delete_view();
		}
		this.add_to_trash(deleteCollection);
		return stopLoop;
	},
	drop_in_container:function(transfer, target){
		/*Set model's parent*/
		var new_sort_order = this.get_new_sort_order(transfer, target);
		transfer.model.set({
			sort_order: new_sort_order
		});
		if(this.model.id != transfer.model.get("parent")){
			var old_parent = transfer.containing_list_view.model;
			transfer.model.set({
				parent: this.model.id
			}, {validate:true});

			if(transfer.model.validationError){
				alert(transfer.model.validationError);
				transfer.model.set({parent: old_parent.id});
				transfer.containing_list_view.render();
			}else{
				transfer.model.save({
					parent: this.model.id,
					sort_order:new_sort_order,
					changed:true
				}, {async:false, validate:false});
				this.model.fetch({async:false});
				if(this.model.get("parent")){
					$("#" + this.model.get("id")).data("data").render();
				}
				old_parent.fetch({async:false});
				if(old_parent.get("parent")){
					$("#" + old_parent.id).data("data").render();
				}
				transfer.containing_list_view.render();
			}
		}else{
			transfer.model.save({
				sort_order:new_sort_order,
				changed:true
			}, {async:false, validate:false});
		}
		this.render();
		if(transfer.$el.hasClass("current_topic")){
			transfer.$el.removeClass("current_topic");
		}
	},
	get_new_sort_order: function(transfer, target){
		var new_sort_order = 1;

		/* Case 1: Remains at 1 if no items in list */
		if(target.data("data") && this.views.length > 0){
			var element = target.data("data");

		/* Case 2: one item in list */
			if(this.views.length == 1){
				new_sort_order =  (target.data("isbelow"))? element.model.get("sort_order") / 2 : element.model.get("sort_order") + 1;
			}else{
				var first_index = element.index;
				var second_index = (target.data("isbelow"))? element.index - 1 : element.index + 1;
				if(second_index == transfer.index){
					second_index = (target.data("isbelow"))? element.index - 1 : element.index + 1;
				}
		/* Case 3: at top of list */
				if(second_index < 0 && target.data("isbelow")){
					new_sort_order = this.views[first_index].model.get("sort_order") / 2;
				}
		/* Case 4: at bottom of list */
				else if(second_index >= this.views.length -1 && !target.data("isbelow")){
					new_sort_order = this.views[first_index].model.get("sort_order") + 1;
				}
		/* Case 5: in middle of list */
				else{
					new_sort_order = (this.views[second_index].model.get("sort_order")
					+ this.views[first_index].model.get("sort_order")) / 2;
				}
			}
		}
		return new_sort_order;
	},

	remove_view: function(view){
		this.views.splice(this.views.indexOf(this), 1);
		view.delete_view();
	},
	add_nodes:function(collection, startingIndex){
		var self = this;
		collection.move(this.model, startingIndex, function(){
			self.list_index = startingIndex;
			collection.add(self.model);
			self.reload_listed(collection);
			self.render();
		});
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
	delete:function(){
    	if(!this.model){
    		this.delete_view();
    	}
		if(this.containing_list_view.item_view != "uploading_content"){
			this.add_to_trash();
		}
	},
	save: function(data, options){
    	if(!this.model){
    		var node_data = new Models.ContentNodeModel(data);
			this.containing_list_view.collection.create(node_data, options);
			if(this.model.get("kind").toLowerCase() != "topic"){
				node_data.create_file();
			}
    	}
		else{
			this.model.save(data, options);
			if(this.model.get("kind") && this.model.get("kind").toLowerCase() != "topic"){
				this.model.create_file();
			}
		}
	},
	set:function(data, options){
		if(!this.model){
    		var node_data = new Models.ContentNodeModel(data);
			this.containing_list_view.collection.create(node_data, options);
			if(this.model.get("kind").toLowerCase() != "topic"){
				node_data.create_file();
			}
    	}else{
    		this.model.set(data, options);
    	}
	},
	open_edit:function(){
		var UploaderViews = require("edit_channel/uploader/views");
		var edit_collection = new Models.ContentNodeCollection();
		edit_collection.add(this.model);

		$("#main-content-area").append("<div id='dialog'></div>");

		var metadata_view = new UploaderViews.EditMetadataView({
			collection: edit_collection,
			parent_view: this,
			el: $("#dialog"),
			allow_add : false,
			main_collection: this.containing_list_view.collection,
			modal:true,
			model: this.model
		});
	}
});

var BaseListChannelItemView = BaseListItemView.extend({
	delete:function(){
		if(!this.model){
    		this.delete_view();
	    }else{
	    	this.model.save({"deleted":true}, {async:false});
	    	this.delete_view();
	    }
	},
	save: function(data, options){
    	if(!this.model){
    		this.model = new Models.ChannelModel(data);
    		this.containing_list_view.collection.create_channel(this.model);
    	}else{
    		this.model.save(data, options);
    	}
	}
});

var BaseEditorView = BaseListView.extend({
	multiple_selected: false,
	current_node: null,
	item_view:"uploading_content",
	unsaved_queue: [], // Used to keep track of temporary model data
	errorsFound : false,
	parent_view : null,
	close_uploader: function(event){
		if(this.unsaved_queue.length == 0){
			if (this.modal) {
				this.$el.modal('hide');
	        }

	        this.remove();
		}else if(confirm("Unsaved Metadata Detected! Exiting now will"
			+ " undo any new changes. \n\nAre you sure you want to exit?")){
			if(!this.allow_add){
				this.views.forEach(function(entry){
					entry.unset_node();
				});
			}
			if (this.modal) {
				this.$el.modal('hide');
	        }
	        this.unsaved_queue = [];
	        this.views = [];
	        this.remove();
		}else{
			event.stopPropagation();
			event.preventDefault();
		}
		if(!this.allow_add){
        	var reload_collection = new Models.ContentNodeCollection();
	        this.views.forEach(function(entry){
	        	reload_collection.add(entry.model);
			});
			this.reload_listed(reload_collection);
	    }
	},
	save_nodes: function(callback){
		this.parent_view.set_editing(false);
		var self = this;
		this.views.forEach(function(entry){
			var tags = [];
			entry.tags.forEach(function(tag){
				tags.push("{\"tag_name\" : \"" + tag + "\",\"channel\" : \"" + window.current_channel.get("id") + "\"}");
			})
			entry.model.set({tags: tags});
			if(entry.format_view){
				entry.format_view.update_file();
				entry.format_view.clean_files();
			}
	        entry.set_edited(false);
		});
		this.errorsFound = this.errorsFound || !this.save_queued();
		this.collection.save(function(){
			callback();
		});

	},
	check_nodes:function(){
		var self = this;
		self.errorsFound = false;
		this.views.forEach(function(entry){
			entry.model.set(entry.model.attributes, {validate:true});
			if(entry.model.validationError){
				self.handle_error(entry);
				self.errorsFound = true;
			}
		});
	},
	set_node_edited:function(){
		this.enqueue(this.current_view);
		this.current_view.set_edited(true);
		this.current_view.set_node();
		this.current_view.render();
	},
	enqueue: function(view){
		var index = this.unsaved_queue.indexOf(view);
		if(index >= 0)
			this.unsaved_queue.splice(index, 1);
		this.unsaved_queue.push(view);
	},
	save_queued:function(){
		var self = this;
		var success = true;
		this.unsaved_queue.forEach(function(entry){
			entry.model.set(entry.model.attributes, {validate:true});
			if(entry.format_view){
				entry.model.set("files", entry.format_view.model.get("files"));
			}
			if(entry.model.validationError){
				self.handle_error(entry);
				success = false;
			}else{
				self.unsaved_queue.splice(self.unsaved_queue.indexOf(entry), 1);
			}
		});

		/*Make sure queue is cleared*/
		if(success){
			this.unsaved_queue.forEach(function(entry){
				self.views.push(self.unsaved_queue.pop());
			});
		}
		return success;
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
	BaseEditorView:BaseEditorView,
	BaseModalView:BaseModalView
}
