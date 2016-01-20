var Backbone = require("backbone");
var _ = require("underscore");
var Models = require("./models");

var clipboardContent = [];

var BaseView = Backbone.View.extend({
	delete_view: function(){
		this.undelegateEvents();
		this.unbind();		
		this.remove();
	}
});

BaseListView = BaseView.extend({
	views: [],			//List of item views to help with garbage collection
	collection : null,		//Collection to be used for data
	allow_edit: false,
	item_view: null, // Use to determine how to save, delete, update files
	model_queue: [], //Used to keep track of which models have been edited but not saved
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
		this.edited.push(model);
	},
	save_queued:function(){
		this.model_queue.forEach(function(entry){
			entry.save();
		});
	},
	clear_queue: function(){
		this.model_queue = [];
	},
	dequeue: function(model){
		this.model_queue.remove(model);
	},
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
		if(!this.model.kind) { 
			/* TODO: destroy all nodes from channel */

		}else{

		}
		this.model.destroy();
		if(delete_view) this.delete_view();
	},
	
	save: function(data){
		/* TODO: Implement funtion to allow saving one item */
		if(!this.model){
			if(!data.title)
				window.channel_router.create_channel(data);
			else
				window.channel_router.create_node(data);
		}
		else{
			this.model.set(data);
			this.model.save();
		}
		this.containing_list_view.render();
	},
	set_editing: function(edit_mode_on){
		this.containing_list_view.set_editing(edit_mode_on);
	},
	enqueue: function(){
		this.containing_list_view.enqueue(this.model);
	},
	dequeue: function(){
		this.containing_list_view.dequeue(this.model);
	}

	/* TODO: use to expand height of content item
	toggle: function(el){
		if($(el).data("collapsed")){
			$(el + "_sub").slideDown();
			$(el).data("collapsed", false);
			$(el+" .tog_folder span").attr("class", "glyphicon glyphicon-menu-down");
		}
		else{
			$(el + "_sub").slideUp();
			$(el).data("collapsed", true);
			$(el+" .tog_folder span").attr("class", "glyphicon glyphicon-menu-up");
		}
	},
	*/
});


module.exports = {
	BaseView: BaseView,
	BaseListView:BaseListView,
	BaseListItemView: BaseListItemView,
}

/*
var BaseEditor = BaseView.extend({
	el : " ",
/*
	updateCount: function(){
		var char_length = this.char_limit - this.$el.val().length; 
		console.log(char_length);
		this.$('.char_counter').text(char_length + ((char_length != 1)? " chars" : " char") + ' left');

		if(char_length == 0) 
			this.$(".char_counter").css("color", "red");
		else 
			this.$(".char_counter").css("color", "black");
	},
	trimText:function(string, limit, el){
		if(string.trim().length - 4 > limit){
			string = string.trim().substring(0, limit - 4) + "...";
			if(el) el.show();
		}
		else
			if(el) el.hide();
		return string;
	}
});
*/