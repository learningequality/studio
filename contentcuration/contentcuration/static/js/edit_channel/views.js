var Backbone = require("backbone");
var _ = require("underscore");
var Models = require("./models");

var BaseView = Backbone.View.extend({
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
});

BaseListView = BaseView.extend({
	views: [],			//List of item views to help with garbage collection
	collection : null,		//Collection to be used for data
	allow_edit: false,
	item_view: null, // Use to determine how to save, delete, update files
	save_all: function(){
		console.log("PERFORMANCE views.js: starting save_all...");
    	var start = new Date().getTime();
		this.views.forEach(function(entry){
			entry.save(entry.model.attributes);
		});
		console.log("PERFORMANCE views.js: save_all end (time = " + (new Date().getTime() - start) + ")");
	},
	set_editing: function(edit_mode_on){
		this.allow_edit = !edit_mode_on;
		$(".disable-on-edit").prop("disabled", edit_mode_on);
		$(".disable-on-edit").css("cursor", (edit_mode_on) ? "not-allowed" : "pointer");
		$(".invisible-on-edit").css('visibility', (edit_mode_on)?'hidden' : 'visible');
	},

	reset: function(){
		console.log("PERFORMANCE views.js: starting reset...");
    	var start = new Date().getTime();
		this.views.forEach(function(entry){
			entry.model.unset();
		}); 
		console.log("PERFORMANCE views.js: reset end (time = " + (new Date().getTime() - start) + ")");
	},
	set_sort_orders: function(collection){
		console.log("PERFORMANCE tree_edit/views.js: starting set_sort_orders ...");
    	var start = new Date().getTime();
		var index = 1;
		var self = this;
		collection.models.forEach(function(entry){
			entry.save({'sort_order' : index++}, {validate: false});
		});
		console.log("PERFORMANCE tree_edit/views.js: set_sort_orders end (time = " + (new Date().getTime() - start) + ")");
	},
	drop_in_container:function(transfer, target){
		console.log("PERFORMANCE views.js: starting drop_in_container...", transfer);
    	var start = new Date().getTime();
		/*Calculate new sort order*/
		var new_sort_order = 1; 
		if(target.data("data") && this.views.length > 0){ //Case 1: Remains at 1 if no items in list
			console.log("add_to_container called inside with " + this.views.length + " views");
			var element = target.data("data");
			
			if(this.views.length == 1){ //Case 2: one item in list
				new_sort_order =  (target.data("isbelow"))? element.model.get("sort_order") / 2 : element.model.get("sort_order") + 1;
			}else{
				var first_index = element.index;
				var second_index = (target.data("isbelow"))? element.index - 1 : element.index + 1;

				if(second_index <= 0 && target.data("isbelow")){ //Case 3: at top of list
					console.log("add_to_container inserting at top of list");
					new_sort_order = this.views[first_index].model.get("sort_order") / 2;
				}
				else if(second_index >= this.views.length -1){ //Case 4: at bottom of list
					console.log("add_to_container inserting at bottom of list");
					new_sort_order = this.views[first_index].model.get("sort_order") + 1;
				}
				else{ //Case 5: in middle of list
					console.log("add_to_container inserting bewteen " + this.views[first_index].model.get("title") 
								+ "(order " + this.views[first_index].model.get("sort_order") + ") and " 
								+ this.views[second_index].model.get("title") + "(order " 
								+ this.views[second_index].model.get("sort_order") + ")");
					new_sort_order = (this.views[second_index].model.get("sort_order") 
					+ this.views[first_index].model.get("sort_order")) / 2;
				}
			}
		}

		/*Set model's parent*/
		var self=this;
		transfer.model.set({
			sort_order: new_sort_order
		});
		if(this.model.id != transfer.model.get("parent")){
			console.log("transferring containers", transfer.model);
			var old_parent = transfer.containing_list_view.model;
			this.model.get("children").push(transfer.model.id);
			transfer.model.set({
				parent: this.model.id
			}, {validate:true});
			
			if(transfer.model.validationError){
				alert(transfer.model.validationError);
				transfer.model.unset({silent:true});
			}else{
				transfer.model.save({parent: this.model.id, sort_order:new_sort_order}, {async:false, validate:false});
				console.log("transferred", transfer.model);
				//var old_parent = this.collection.get_all_fetch([old_parentid]).models[0];
				/*console.log("old parent", old_parent);
				console.log("OLD CHILDREN", old_parent.get("children"));
				console.log("INDEX", new_children.indexOf(transfer.model.id));
				var new_children = old_parent.get("children");
				new_children.splice(new_children.indexOf(transfer.model.id), 1);
				
				old_parent.save({"children": new_children}, {async:false, validate:false});
				//console.log("NEW CHILDREN", old_parent.get("children"));*/
				//transfer.containing_list_view.collection.remove();
			}
			//transfer.containing_list_view.render();
		}else{
			transfer.model.save({sort_order:new_sort_order}, {async:false, validate:false});
		}
			
		console.log("add_to_container model", transfer.model);
		console.log("PERFORMANCE views.js: drop_in_container end (time = " + (new Date().getTime() - start) + ")");
		this.render();
	},
	remove_view: function(view){
		this.views.splice(this.views.indexOf(this), 1);
		view.delete_view();
	}
});


var BaseListItemView = BaseView.extend({
	containing_list_view:null,
	delete:function(){
		console.log("PERFORMANCE views.js: starting delete " + this.model.get("title") + "...");
    	var start = new Date().getTime();
		if(!this.model.get("kind")) { 
			this.model.delete_channel();
		}else{
			if(this.containing_list_view.item_view != "uploading_content"){
				if(!this.deleted_root)
					this.deleted_root = window.current_channel.get_tree("deleted").get_root();
				
				/*Check if node name already exists in trash, then delete older version*/
				var self = this;
				var trash_collection = this.containing_list_view.collection.get_all_fetch(this.deleted_root.get("children"));
				trash_collection.forEach(function(entry){
					if(entry.get("title") == self.model.get("title")){
						entry.destroy({async:false});
					}
				});

				var new_children = this.containing_list_view.model.get("children");
				new_children.splice(new_children.indexOf(this.model.id), 1);
				console.log("new children", new_children);
				this.containing_list_view.model.save({"children" : new_children}, {validate:false});
				this.model.save({"parent" :this.deleted_root.id}, {validate:false});
				this.containing_list_view.remove_view(this);

			}
		}
		console.log("PERFORMANCE views.js: delete " + this.model.get("title") + " end (time = " + (new Date().getTime() - start) + ")");
	},

	save: function(data, options){
		console.log("PERFORMANCE views.js: starting save " + ((data && data.title) ? data.title : "") + "...");
    	var start = new Date().getTime();
		/* TODO: Implement funtion to allow saving one item */
		if(!this.model){
			if(this.containing_list_view.item_view == "channel"){
				this.containing_list_view.collection.create_channel(data, $(".createprogress"));
			}
			else{
				var node_data = new Models.NodeModel(data);
				node_data.fetch();
				this.containing_list_view.collection.create(node_data, options);
			}
		}
		else{
			this.model.save(data, options);
			
			if(this.containing_list_view.item_view == "channel"){
				this.model.update_root({
					'title' : data.name, 
					'description' : data.description
				});
			}			
		}
		console.log("PERFORMANCE views.js: save " + ((data && data.title) ? data.title : "") + " end (time = " +((new Date().getTime() - start)/1000) + "s)");
	},

	set_editing: function(edit_mode_on){
		this.containing_list_view.set_editing(edit_mode_on);
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
			this.parent_view.set_editing(false);
			this.delete_view();
		}else if(confirm("Unsaved Metadata Detected! Exiting now will"
			+ " undo any new changes. \n\nAre you sure you want to exit?")){
			if(!this.allow_add){
				this.views.forEach(function(entry){
					entry.unset_node();
				});
			}
			this.parent_view.render();
			this.parent_view.set_editing(false);
			this.delete_view();
		}
	},
	save_nodes: function(){
		console.log("PERFORMANCE uploader/views.js: starting save_nodes...");
    	var start = new Date().getTime();
		this.parent_view.set_editing(false);
		var self = this;
		this.views.forEach(function(entry){
			entry.model.set(entry.model.attributes, {validate:true});
			if(!entry.model.validationError){
				if(!self.allow_add)
					entry.save(null, {validate:false, async:false});
				entry.set_edited(false);
			}else{
				self.handle_error(entry);
				self.errorsFound = true;
			}
		});
		this.errorsFound = this.errorsFound || !this.save_queued();
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
		return success;
	}
});


module.exports = {
	BaseView: BaseView,
	BaseListView:BaseListView,
	BaseListItemView: BaseListItemView,
	BaseEditorView:BaseEditorView
}