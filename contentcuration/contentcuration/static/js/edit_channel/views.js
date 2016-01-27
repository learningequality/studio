var Backbone = require("backbone");
var _ = require("underscore");
var Models = require("./models");

var clipboardContent = [];

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
	save_all: function(){
		this.views.forEach(function(entry){
			entry.save();
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
	save_queued:function(){
		this.model_queue.forEach(function(entry){
			entry.save();
		});
		this.model_queue = [];
	},
	dequeue: function(model){
		this.model_queue.remove(model);
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
	delete:function(delete_view){
		if(!this.model.attributes.kind) { 
			/* TODO: destroy all nodes from channel */
			this.model.destroy();
		}else{
			this.model.destroy(); //TEMPORARY WAY TO DELETE
			/* TODO: send to trash instead
			this.model.set({"deleted" : true}, true);
			this.model.save();
			*/
		}
		
		if(delete_view) this.delete_view();
	},

	save: function(data){
		/* TODO: Implement funtion to allow saving one item */
		console.log("data saved", this.model);
		if(!this.model){
			if(!data.title){
				var channel_data = new Models.ChannelModel(data);
				channel_data.fetch();
				this.containing_list_view.collection.create(channel_data, {
					success: function(){
						var root_node = new Models.NodeModel();
						root_node.save({title: channel_data.attributes.name}, {
							success: function(){
								var new_tree = new Models.TopicTreeModel({
									channel: channel_data.id, 
									root_node: root_node.id,
									title: channel_data.name
								});
								new_tree.save();
							}
						});
		   			}
				});
			}
			else{
				var node_data = new Models.NodeModel(data);
				node_data.fetch();
				this.containing_list_view.collection.create(node_data);
			}
		}
		else{
			this.model.set(data);
			this.model.save();
		}
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