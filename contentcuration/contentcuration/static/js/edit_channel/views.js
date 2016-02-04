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
	model_queue: [], // Used to keep track of temporary model data
	topictrees : null,
	save_all: function(){
		$(this.views).each(function(){
			this.save(this.model.attributes);
		});
		this.save_queued();
	},

	set_editing: function(edit_mode_on){
		this.allow_edit = !edit_mode_on;
		$(".disable-on-edit").prop("disabled", edit_mode_on);
		$(".disable-on-edit").css("cursor", (edit_mode_on) ? "not-allowed" : "pointer");
		$(".invisible-on-edit").css('visibility', (edit_mode_on)?'hidden' : 'visible');
	},
	enqueue: function(model){
		this.model_queue.push(model);
	},
	dequeue:function(model){
		this.model_queue.remove(model);
	},
	save_queued:function(){
		this.model_queue.forEach(function(entry){
			entry.save();
		});
		this.model_queue = [];
	},
	reset: function(){
		this.views.forEach(function(entry){
			entry.model.unset();
		});
	}
	/* TODO: Figure out way to abstract loading content 
	load_content:function(){
	
		var containing_list_view = this;
		switch(this.item_view){
			case "channel":
				var ChannelViews = require("./new_channel/views");
			break;
			
			case "clipboard":
				this.collection.forEach(function(entry){
					var clipboard_item_view = new ClipboardListItemView({
						containing_list_view: containing_list_view,
						el: containing_list_view.$el.find("#" + entry.cid),
						model: entry
					});
					containing_list_view.views.push(clipboard_item_view);
				});
			break;
			case "adding_content":
				this.collection.forEach(function(entry){
					var node_view = new NodeListItem({
						edit: false,
						containing_list_view: containing_list_view,
						el: containing_list_view.$el.find("#" + entry.cid),
						model: entry
					});
					containing_list_view.views.push(node_view);
				});
			break;
			case "uploading_content":
				this.collection.forEach(function(entry){
					var node_view = new UploadedItem({
						model: entry,
						el: $("#uploaded_list #item_" + entry.cid),
						containing_list_view: containing_list_view,
						root: root,
					});
					containing_list_view.views.push(node_view);
				});
			break;
			case "node":
				this.collection.forEach(function(entry){
					el.append("<li id='"+ entry.cid +"'></li>");
					var file_view = new ContentView({
						el: el.find(".content-list #" + entry.cid),
						model: entry, 
						edit_mode: edit_mode,
						containing_list_view:containing_list_view,
						allow_edit: false
					});
					containing_list_view.views.push(file_view);
				});
			break;
			
		}
	}*/
});


var BaseListItemView = BaseView.extend({
	containing_list_view:null,
	delete:function(){
		if(!this.model.get("kind")) { 
			/* TODO: destroy all nodes from channel */
			this.model.delete_channel();
		}else{
			if(this.containing_list_view.item_view != "uploading_content"){
				console.log("trees",window.current_channel.deleted);
				if(!this.deleted_root)
					this.deleted_root = this.containing_list_view.topictrees.get({id : window.current_channel.deleted}).get("root_node");
				this.model.save("parent" , this.deleted_root);
				this.containing_list_view.collection.remove(this.model);
				/*TODO: check if node name already exists in trash, then delete older version*/
			}
		}
	},

	save: function(data){

		/* TODO: Implement funtion to allow saving one item */
		if(!this.model){
			if(!data.title){
				this.containing_list_view.collection.create_channel(data, $(".createprogress"));
			}
			else{
				var node_data = new Models.NodeModel(data);
				node_data.fetch();
				this.containing_list_view.collection.create(node_data,{
					error: function(model, response) {
			            console.log(model);
			        },
				});
			}
		}
		else{
			console.log("before save", this.model);
			this.model.save(data, {
				async:false,
				error: function(model, response) {
		            console.log("error", model);
		        },
			});
			if(!data.title){ //Saving a channel
				this.model.update_root({
					'title' : data.name, 
					'description' : data.description
				});
			}			
		}
		console.log("at save", this.model);
	},
	publish:function(){
		this.model.save("published", true);

		//Save published of all children
	},
	set_editing: function(edit_mode_on){
		this.containing_list_view.set_editing(edit_mode_on);
	},
	/*Set up to be saved*/
	enqueue: function(){
		this.containing_list_view.enqueue(this.model);
	},
	/*Remove from list to be saved*/
	dequeue: function(){
		this.containing_list_view.dequeue(this.model);
	},
});


module.exports = {
	BaseView: BaseView,
	BaseListView:BaseListView,
	BaseListItemView: BaseListItemView,
}