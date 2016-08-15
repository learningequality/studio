var Backbone = require("backbone");
var Models = require("./../models");
var _ = require("underscore");
require("content-container.less");
var BaseViews = require("./../views");
var QueueView = require("edit_channel/queue/views");
var DragHelper = require("edit_channel/utils/drag_drop");
var UploaderViews = require("edit_channel/uploader/views");
var ShareViews = require("edit_channel/share/views");
var Previewer = require("edit_channel/preview/views");
//var UndoManager = require("backbone-undo");

/**
 * Main view for all draft tree editing
 * @param {ContentNodeModel} model (root of channel)
 * @param {ContentNodeCollection} collection
 * @param {boolean} is_clipboard (determines how to render screen)
 * @param {boolean} is_edit_page (determines if previewing or editing)
 */
var TreeEditView = BaseViews.BaseWorkspaceView.extend({
	containers:[],
	template: require("./hbtemplates/container_area.handlebars"),
	dropdown_template: require("./hbtemplates/channel_dropdown.handlebars"),
	queue_view: null,
	initialize: function(options) {
		_.bindAll(this, 'copy_content','delete_content' , 'add_container','toggle_details', 'handle_checked');
		this.bind_workspace_functions();
		this.is_edit_page = options.edit;
		this.collection = options.collection;
		this.is_clipboard = options.is_clipboard;
		this.render();
	},
	events: {
		'click .copy_button' : 'copy_content',
		'click .delete_button' : 'delete_content',
		'click .edit_button' : 'edit_selected',
		'click #hide_details_checkbox' :'toggle_details',
		'change input[type=checkbox]' : 'handle_checked',
		'click .permissions_button' : 'edit_permissions'
	},
	render: function() {
		var self=this;
		this.display_load("Loading Studio...", function(resolve, reject){
			self.$el.html(self.template({
				edit: self.is_edit_page,
				channel : window.current_channel.toJSON(),
				is_clipboard : self.is_clipboard
			}));
			if(self.is_clipboard){
				$("#secondary-nav").css("display","none");
				$("#channel-edit-content-wrapper").css("background-color", "#EDDEED");
			}

			$("#channel-edit-content-wrapper").data("data", self);
			$("#main-nav-home-button").removeClass("active");

			(self.is_edit_page) ? $("#channel-edit-button").addClass("active") : $("#channel-preview-button").addClass("active");

		 	$("#channel_select_dd_wrapper").html(self.dropdown_template({
				channel_list: window.channels.toJSON(),
				current_channel: window.current_channel.toJSON()
			}));
			self.add_container(self.containers.length, self.model);

			// self.queue_view = new QueueView.Queue({
		 // 		el: $("#queue-area"),
		 // 		collection: self.collection
		 // 	});
		 // 	$("#queue-area").css("display", (self.is_clipboard || !self.is_edit_page)? "none" : "block");
			resolve(true);
		});
	},
	add_container: function(index, topic, view = null){
		/* Step 1: Close directories of children and siblings of opened topic*/
			if(index < this.containers.length){
				this.remove_containers_from(index);
			}
		/* Step 2: Create new container */
			var self = this;
			var container_view = new ContentList({
				model: topic,
				index: self.containers.length + 1,
				edit_mode: self.is_edit_page,
				collection: self.collection,
				container : self,
				content_node_view: view
			});
			self.containers.push(container_view);

		/* Step 3: Add container to DOM */
			self.$("#container-wrapper").scrollLeft(self.$("#container_area").width());
			self.$el.find("#container_area").width(self.$el.find("#container_area").width() + self.containers[0].$el.outerWidth());
			self.$el.find("#container_area").append(container_view.el);
			return container_view;
	},
	remove_containers_from:function(index){
		while(this.containers.length > index){
			this.$el.find("#container_area").width(this.$el.find("#container_area").width() - this.containers[0].$el.outerWidth());
			this.containers.splice(this.containers.length-1);
		}
		this.containers[this.containers.length-1].close_folders();
		this.handle_checked();
	},
	handle_checked:function(){
		var checked_count = this.$el.find(".content input[type=checkbox]:checked").length;
		this.$(".disable-none-selected").prop("disabled", checked_count === 0);
		(checked_count > 0)? this.$("#disable-none-selected-wrapper").removeClass("disabled-wrapper") : this.$("#disable-none-selected-wrapper").addClass("disabled-wrapper");
	},
	toggle_details:function(event){
		this.$el.find("#container_area").toggleClass("hidden_details");
	},
	add_to_trash:function(collection, resolve, reject){
		this.queue_view.add_to_trash(collection, resolve, reject);
	},
	add_to_clipboard:function(collection, resolve, reject){
		this.queue_view.render();
		resolve(true);
		//this.queue_view.add_to_clipboard(collection);
	},
	delete_content: function (event){
		if(confirm("Are you sure you want to delete these selected items?")){
			var self = this;
			this.display_load("Deleting Content...", function(resolve, reject){
				try{
					var promises = [];
					for(var i = 0; i < self.containers.length; i++){
						promises.push(new Promise(function(resolve, reject){
							self.containers[i].delete_selected(resolve, reject)
	    				}));
	    				if(self.containers[i].$el.find(".current_topic input").is(":checked")){
	    					self.remove_containers_from(self.containers[i].index);
							break;
	    				}
					}
					Promise.all(promises).then(function(){
						resolve("Success!");
					})
				}catch(error){
					reject(error);
				}
			});
		}
	},
	copy_content: function(event){
		var self = this;
		this.display_load("Copying Content...", function(resolve, reject){
			var promises = [];
			for(var i = 0; i < self.containers.length; i++){
				promises.push(new Promise(function(resolve, reject){
					self.containers[i].copy_selected(resolve, reject)
				}));
				if(self.containers[i].$el.find(".current_topic input:checked").length != 0){
					break;
				}
			}
			Promise.all(promises).then(function(){
				resolve("Success!");
			});
		});
	}
});

/* Open directory view */
// model (ContentNodeModel): root of directory
// edit_mode (boolean): tells how to render ui
// container (TreeEditView): link to main tree view
// index (int): index of where container is in structure
var ContentList = BaseViews.BaseWorkspaceListView.extend({
	template: require("./hbtemplates/content_container.handlebars"),
	current_node : null,
	tagName: "li",
	list_selector:".content-list",
	default_item:">.content-list .default-item",

	'id': function() {
		return "container_" + this.model.get("id");
	},
	className: "container content-container pre_animation",

	initialize: function(options) {
		_.bindAll(this, 'close_container', 'update_name');
		this.index = options.index;
		this.edit_mode = options.edit_mode;
		this.container = options.container;
		this.collection = options.collection;
		this.content_node_view = options.content_node_view;
		this.render();
		// this.listenTo(this.model, 'change:title', this.update_name)
		// this.listenTo(this.model, 'change:children', function(data){
		// 	this.content_node_view.render();
		// });
		this.bind_edit_functions();
	},
	events: {
		'click .create_new_button':'add_topic',
		'click .import_button':'import_content',
		'click .back_button' :'close_container',
		'click .upload_files_button': 'add_files'
	},
	render: function() {
		this.$el.html(this.template({
			topic: this.model.toJSON(),
			title: (this.model.get("parent"))? this.model.get("title") : window.current_channel.get("name"),
			edit_mode: this.edit_mode,
			index: this.index,
		}));
		var self = this;
		this.collection.get_all_fetch(this.model.get("children")).then(function(fetchedCollection){
			self.$el.find(".default-item").text("No items found.");
			fetchedCollection.sort_by_order();
			self.load_content(fetchedCollection);
		});
		DragHelper.addSortable(this, 'content-selected', this.drop_in_container);
		setTimeout(function(){
			self.$el.removeClass("pre_animation").addClass("post_animation");
			$( ".content-list" ).sortable( "refresh" );
			$( ".content-list" ).sortable( "enable" );
		}, 100);
	},
	update_name:function(){
		this.$el.find(".container-title").html(this.model.get("title"));
	},
	add_container:function(view){
		this.current_node = view.model.id;
		return this.container.add_container(this.index, view.model, view);
	},
  /* Resets folders to initial state */
	close_folders:function(){
		this.views.forEach(function(entry){
			entry.set_opened(false);
		});
		this.$el.find(".current_topic").removeClass("current_topic")
	},
	close_container:function(){
		var self = this;
		this.$el.removeClass("post_animation").addClass("remove_animation");
		this.container.remove_containers_from(this.index - 1);
		setTimeout(function(){
			self.remove();
		}, 100);
	},
	create_new_view:function(model){
	  	var newView = new ContentItem({
			model: model,
			edit_mode: this.edit_mode,
			containing_list_view:this
		});
	  	this.views.push(newView);
		return newView;
	},
});

/*folders, files, exercises listed*/
// model (ContentNodeModel): node that is being displayed
// edit_mode (boolean): tells how to render ui
// containing_list_view (ContentList): list item is contained in
// resolve (function): function to call when completed rendering
// reject (function): function to call if failed to render
var ContentItem = BaseViews.BaseWorkspaceListNodeItemView.extend({
	template: require("./hbtemplates/content_list_item.handlebars"),
	selectedClass: "content-selected",
	'id': function() {
		return this.model.get("id");
	},
	className: "content draggable to_publish",
	initialize: function(options) {
		_.bindAll(this, 'handle_hover','open_edit','handle_drop','handle_checked','handle_edit_submit', 'hover_open_folder','open_folder','edit_item','preview_node', 'reload');
		this.edit_mode = options.edit_mode;
		this.containing_list_view = options.containing_list_view;
		this.render();
	},
	render:function(){
		/* Step 1: Load html */
			this.$el.html(this.template({
				node: this.model,
				isfolder: this.model.get("kind").toLowerCase() == "topic",
				edit_mode: this.edit_mode
			}));
			this.$el.data("data", this);
			if($("#hide_details_checkbox").attr("checked"))
				this.$el.find("label").addClass("hidden_details");
		/* Step 2: Add droppable if this is a topic node */
			if(this.model.get("kind") == "topic"){
				DragHelper.addTopicDragDrop(this, this.handle_hover, this.handle_drop);
			}
			this.$el.removeClass("content-selected");
	},
	events: {
		'click .edit_folder_button': 'edit_item',
		'click .open_folder':'open_folder',
		'click .folder' : "open_folder",
		'click .preview_button': 'preview_node',
		'click .file' : 'preview_node',
		'change input[type=checkbox]': 'handle_checked'
	},
	hover_open_folder:function(event){
		this.open_folder(event);
	},
	open_folder:function(event){
		event.preventDefault();
		event.stopPropagation();
		this.containing_list_view.close_folders();
		this.subcontent_view = this.containing_list_view.add_container(this);
		this.$el.addClass("current_topic")
	},
	preview_node: function(event){
		event.preventDefault();
		$("#main-content-area").append("<div id='dialog'></div>");
		var data={
			el : $("#dialog"),
			model: this.model,
			allow_add: false,
			main_collection : this.main_collection,
			modal: true,
			parent_view : this
		}
		(this.edit_mode)? this.open_edit() : new Previewer.PreviewModalView(data);
	}
});


module.exports = {
	TreeEditView: TreeEditView
}