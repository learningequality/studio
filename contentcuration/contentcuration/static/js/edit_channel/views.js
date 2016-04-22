var Backbone = require("backbone");
var _ = require("underscore");
var Models = require("./models");
//var UndoManager = require("backbone-undo");

var BaseView = Backbone.View.extend({
	list_index : 0,
	undo_manager: null,
	queue_view: null,
	delete_view: function(){
		//this.undelegateEvents();
		//this.unbind();
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
		var edit_collection = new Models.NodeCollection();
		/* Create list of nodes to edit */
		for(var i = 0; i < list.length; i++){
			var model = $(list[i]).data("data").model;
			edit_collection.add(model);
		}
		$("#main-content-area").append("<div id='dialog'></div>");
		var content = null;
		if(edit_collection.length ==1)
			content = edit_collection.models[0];
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
		var new_collection = new Models.NodeCollection();
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
    	console.log("displaying load");
    	var self = this;
		var load = '<div id="loading_modal" class="text-center">' +
            '<div id="kolibri_load_gif"></div>' +
            '<h4 id="kolibri_load_text" class="text-center">' + message + '</h4>' +
            '</div>';
        $(load).appendTo('body');

        if(callback){
    		setTimeout(function(){
				callback();
				$("#loading_modal").remove();
			 }, 800);
    	}else{
    		$("#loading_modal").remove();
    	}
    },
	add_to_trash:function(views){
		//OVERWRITE IN SUBCLASSES
	},
	add_to_clipboard:function(views){
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
			entry.set({'sort_order' : index++}, {validate: false});
		});
	},
	copy_selected:function(){
		var list = this.$el.find('input:checked').parent("li");
		var clipboard_list = [];
		var clipboard_root = window.current_channel.get_tree("clipboard").get_root();
		for(var i = 0; i < list.length; i++){
			var newNode = new Models.NodeModel();
			newNode = $(list[i]).data("data").model.duplicate(clipboard_root);
			clipboard_list.push(newNode);
		}
		this.add_to_clipboard(clipboard_list);
		return this.$el.find(".current_topic input:checked").length != 0;
	},
	delete_selected:function(){
		var list = this.$el.find('input:checked').parent("li");
		var stopLoop = this.$el.find(".current_topic input").is(":checked");
		var to_delete = [];
		for(var i = 0; i < list.length; i++){
			var view = $("#" + list[i].id).data("data");
			to_delete.push(view);
		}
		this.add_to_trash(to_delete);
		return stopLoop;
	},
	drop_in_container:function(transfer, target){
		console.log("PERFORMANCE views.js: starting drop_in_container...", transfer);
    	var start = new Date().getTime();
		/*Calculate new sort order*/
		var new_sort_order = this.get_new_sort_order(transfer, target);
		console.log("NEW SORT ORDER IS: " , new_sort_order);

		/*Set model's parent*/
		var self=this;
		transfer.model.set({
			sort_order: new_sort_order
		});
		if(this.model.id != transfer.model.get("parent")){
			var old_parent = transfer.containing_list_view.model;
			if(transfer.model.move(this.model, false, new_sort_order) != null){
				alert(transfer.model.validationError);
				transfer.model.save({parent: old_parent.id});
				transfer.containing_list_view.render();
			}
			else{
				this.model.get("children").push(transfer.model.id);
				transfer.model.save({parent: this.model.id, sort_order:new_sort_order}, {async:false, validate:false});
				old_parent.get("children").splice(old_parent.get("children").indexOf(transfer.model.id), 1);
			}
		}else{
			transfer.model.save({sort_order:new_sort_order}, {async:false, validate:false});
		}
		console.log("PERFORMANCE views.js: drop_in_container end (time = " + (new Date().getTime() - start) + ")");
		this.render();
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
	add_nodes:function(views, startingIndex){
		console.log("PERFORMANCE tree_edit/views.js: starting add_nodes ...");
    	var start = new Date().getTime();
		var self = this;
		var counter = self.model.get("children");
		views.forEach(function(entry){
			var model = (entry.model) ? entry.model : entry;
			model.move(self.model, true, ++counter);
			self.model.get("children").push(model.id);
		});
		this.list_index = startingIndex;

		this.render();
		console.log("PERFORMANCE tree_edit/views.js: add_nodes end (time = " + (new Date().getTime() - start) + ")");
	}
});


var BaseListItemView = BaseView.extend({
	containing_list_view:null,
	set_editing: function(edit_mode_on){
		this.containing_list_view.set_editing(edit_mode_on);
	}
});

var BaseListNodeItemView = BaseListItemView.extend({
	delete:function(){
    	var start = new Date().getTime();
    	if(!this.model){
    		this.delete_view();
    		return;
    	}

		if(this.containing_list_view.item_view != "uploading_content"){
			this.add_to_trash();
		}
		console.log("PERFORMANCE views.js: delete " + this.model.get("title") + " end (time = " + (new Date().getTime() - start) + ")");
	},
	save: function(data, options){
		console.log("PERFORMANCE views.js: starting save " + ((data && data.title) ? data.title : "") + "...");
    	var start = new Date().getTime();
    	if(!this.model){
    		var node_data = new Models.NodeModel(data);
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
		console.log("PERFORMANCE views.js: save " + ((data && data.title) ? data.title : "") + " end (time = " +((new Date().getTime() - start)/1000) + "s)");
	},
	set:function(data, options){
		if(!this.model){
    		var node_data = new Models.NodeModel(data);
			this.containing_list_view.collection.create(node_data, options);
			if(this.model.get("kind").toLowerCase() != "topic"){
				node_data.create_file();
			}
    	}else{
    		this.model.set(data, options);
    	}
	}
});

var BaseListChannelItemView = BaseListItemView.extend({
	delete:function(){
    	var start = new Date().getTime();
    	if(!this.model){
    		this.delete_view();
    		return;
    	}
    	this.model.destroy();
		console.log("PERFORMANCE views.js: delete " + this.model.get("title") + " end (time = " + (new Date().getTime() - start) + ")");
	},
	save: function(data, options){
    	this.containing_list_view.collection.save();
	},
	set:function(data, options){
		if(!this.model){
    		this.model = new Models.ChannelModel(data);
    		this.containing_list_view.collection.create_channel(this.model);
    	}else{
    		this.model.set(data, options);
    	}
	}
});

var BaseEditorView = BaseListView.extend({
	disable: false,
	current_node: null,
	item_view:"uploading_content",
	unsaved_queue: [], // Used to keep track of temporary model data
	errorsFound : false,
	parent_view : null,
	close_uploader: function(){
		if(this.unsaved_queue.length == 0){
			this.parent_view.render();
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
			this.parent_view.render();
			if (this.modal) {
				this.$el.modal('hide');
	        }
	        this.remove();
		}
	},
	save_nodes: function(){
		console.log("PERFORMANCE uploader/views.js: starting save_nodes...");
    	var start = new Date().getTime();
		this.parent_view.set_editing(false);
		var self = this;
		this.views.forEach(function(entry){
	        entry.save(entry.model.attributes, {async:false, validate:false});
	        entry.set_edited(false);
		});
		this.errorsFound = this.errorsFound || !this.save_queued();
	},
	check_nodes:function(){
		var self = this;
		self.errorsFound = true;

		this.views.forEach(function(entry){
			entry.model.set(entry.model.attributes, {validate:true});
			if(entry.model.validationError){
				self.handle_error(entry);
				self.errorsFound = false;
			}
		});
		//this.$el.find("#validating_text").css("display", "none");
		return self.errorsFound ;
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
			self.unsaved_queue.splice(self.unsaved_queue.indexOf(entry), 1);
			if(entry.model.validationError){
				self.handle_error(entry);
				success = false;
			}
		});
		if(success){
			this.unsaved_queue.forEach(function(entry){
				self.views.push(self.unsaved_queue.pop());
			});
		}
		return success;
	}
});

module.exports = {
	BaseView: BaseView,
	BaseListView:BaseListView,
	BaseListChannelItemView: BaseListChannelItemView,
	BaseListNodeItemView:BaseListNodeItemView,
	BaseEditorView:BaseEditorView
}
