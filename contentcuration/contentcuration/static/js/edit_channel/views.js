var Backbone = require("backbone");
var _ = require("underscore");
var Models = require("./models");

var BaseView = Backbone.View.extend({
	delete_view: function(){
		this.undelegateEvents();
		this.unbind();		
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
	topictrees : null,
	save_all: function(){
		$(this.views).each(function(){
			this.save(this.model.attributes);
		});
	},
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
	drop_in_container:function(transfer, target){
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
			sort_order: new_sort_order,
		});
		if(this.model.id != transfer.model.get("parent")){
			this.model.get("children").push(transfer.model.id);
			transfer.model.set({
				parent: this.model.id
			}, {validate:true});
			transfer.model.save({
				async:false,
				success:function(){
					transfer.containing_list_view.render();
				}
			});
			
		}else
			transfer.model.save({async:false});
		console.log("add_to_container model", transfer.model);
		this.render();
	}
});


var BaseListItemView = BaseView.extend({
	containing_list_view:null,
	delete:function(){
		if(!this.model.get("kind")) { 
			this.model.delete_channel();
		}else{
			if(this.containing_list_view.item_view != "uploading_content"){
				this.containing_list_view.lock = true;
				if(!this.deleted_root)
					this.deleted_root = this.containing_list_view.topictrees.get({id : window.current_channel.deleted}).get_root();
				
				/*Check if node name already exists in trash, then delete older version*/
				var self = this;
				var trash_collection = this.containing_list_view.collection.get_all_fetch(this.deleted_root.get("children"));
				$(trash_collection.models).each(function(){
					if(this.get("title") == self.model.get("title")){
						this.destroy({async:false});
					}
				});
				
				var old_parent = this.containing_list_view.collection.add({id: this.model.get("parent")});
				old_parent.fetch();
				console.log("old parent before", old_parent.get("children"));
				console.log("deleted root", this.deleted_root);
				this.model.save({"parent" :this.deleted_root.id}, {async:false, success:function(){console.log("called save");}});
				console.log("old parent after", old_parent.get("children"));
				this.delete_view();
				this.containing_list_view.lock = false;
				//this.containing_list_view.collection.remove(this.model);
			}
		}
	},

	save: function(data, options){
		/* TODO: Implement funtion to allow saving one item */
		if(!this.model){
			if(!data.title){
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
			
			if(!data.title){ //Saving a channel
				this.model.update_root({
					'title' : data.name, 
					'description' : data.description
				});
			}			
		}
	},

	set_editing: function(edit_mode_on){
		this.containing_list_view.set_editing(edit_mode_on);
	},
});


module.exports = {
	BaseView: BaseView,
	BaseListView:BaseListView,
	BaseListItemView: BaseListItemView,
}