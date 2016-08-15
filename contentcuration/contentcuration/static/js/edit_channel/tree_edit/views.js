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
var Import = require("edit_channel/import/views");
//var UndoManager = require("backbone-undo");

/**
 * Main view for all draft tree editing
 * @param {ContentNodeModel} model (root of channel)
 * @param {ContentNodeCollection} collection
 * @param {boolean} is_clipboard (determines how to render screen)
 * @param {boolean} is_edit_page (determines if previewing or editing)
 */
var TreeEditView = BaseViews.BaseView.extend({
	containers:[],
	template: require("./hbtemplates/container_area.handlebars"),
	dropdown_template: require("./hbtemplates/channel_dropdown.handlebars"),
	queue_view: null,
	initialize: function(options) {
		_.bindAll(this, 'copy_content','delete_content' , 'add_container', 'edit_selected',
						'toggle_details', 'handle_checked', 'edit_permissions', 'reload_ancestors');
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
			self.$el.find("#container_area").append(container_view.el);
			self.$el.find("#container_area").width(self.$el.find("#container_area").width() + self.containers[0].$el.outerWidth());
			container_view.$el.css('margin-left', -container_view.$el.outerWidth());

		/* Step 4: Add sortable to view */
			DragHelper.addSortable(container_view, 'content-selected', container_view.drop_in_container);
			setTimeout(function(){
				$( ".content-list" ).sortable( "refresh" );
				$( ".content-list" ).sortable( "enable" );
			}, 500);
		/* Step 5: Animate sliding in from left and resolve */
			// container_view.$el.animate({
			// 	'margin-left' : "0px"
			// }, 500);
			self.handle_checked();
			return container_view;
	},
	remove_containers_from:function(index){
		while(this.containers.length > index){
			this.$el.find("#container_area").width(this.$el.find("#container_area").width() - this.containers[0].$el.outerWidth());
			this.containers[this.containers.length-1].remove();
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
// resolve (function): function to call when view has completely rendered
// reject (function): function to call if view fails to render
// index (int): index of where container is in structure
var ContentList = BaseViews.BaseListView.extend({
	template: require("./hbtemplates/content_container.handlebars"),
	current_node : null,
	tagName: "li",
	item_class:"content",
	indent: 0,
	'id': function() {
		return "container_" + this.model.get("id");
	},
	className: "container content-container",

	_mapping: function(model) {
		return{
			model: model,
			edit_mode: this.edit_mode,
			containing_list_view:this
		}
	},

	initialize: function(options) {
		_.bindAll(this, 'add_topic','add_nodes', 'create_new_view', 'drop_in_container','handle_transfer_drop',
			'close_container');
		// 			'import_content','import_nodes',
		// 			'add_files','update_name','check_number_of_items_in_list');
		this.index = options.index;
		this.edit_mode = options.edit_mode;
		this.container = options.container;
		this.collection = options.collection;
		this.content_node_view = options.content_node_view;
		this.render();
		this.listenTo(this.model, 'change:children', function(data){
			this.content_node_view.render();
		});
		this.bind_edit_functions();
	},
	events: {
		'click .create_new_button':'add_topic',
		'click .import_button':'import_content',
		'click .back_button' :'close_container',
		'click .upload_files_button': 'add_files'
	},
	render: function() {
		// /* Step 2: Load container to DOM and load content*/
		this.$el.html(this.template({
			topic: this.model.toJSON(),
			title: (this.model.get("parent"))? this.model.get("title") : window.current_channel.get("name"),
			edit_mode: this.edit_mode,
			index: this.index,
		}));
		this.load_content();
	},
	render_views: function(){
		var self = this;
    	this.list_index = 0;
		this.views.forEach(function(view){
			view.index = self.list_index++;
			self.$el.find(">.content-list").append(view.el);
			if(self.current_node && view.model.id === self.current_node){
				view.set_opened(true, false);
			}
		});
		this.check_number_of_items_in_list();
		this.container.handle_checked();
		DragHelper.addSortable(this, 'content-selected', this.drop_in_container);
		this.$el.find("ul").data("list", this);
		this.$el.data("container", this);
	},
	load_content : function(){
		this.views = [];
		var self = this;
		var el = this.$el.find(".content-list");

		this.model.fetch({
			success:function(model){
				self.collection.get_all_fetch(model.get("children")).then(function(fetchedCollection){
					fetchedCollection.sort_by_order();
					/* Step 2: Go through content and create nodes */
					fetchedCollection.forEach(function(entry){
						self.create_new_view(entry);
					});
					self.render_views();
				});
			}
		});

	},
	add_container:function(view){
		this.current_node = view.model.id;
		return this.container.add_container(this.index, view.model, view);
	},
	check_number_of_items_in_list:function(){
  	this.$el.find(".default-item").css("display", (this.views.length === 0) ? "block" : "none");
  	this.$el.find(".default-item").text("No items found.");
  },

  /* Resets folders to initial state */
	close_folders:function(){
		this.views.forEach(function(entry){
			entry.set_opened(false);
		});
	},
	close_container:function(views){
		var self = this;
		this.$el.animate({'margin-left' : -this.$el.outerWidth()}, 100,function(){
			self.container.remove_containers_from(self.index - 1);
		});
	},
	create_new_view:function(model){
	  	var newView = new ContentItem(this._mapping(model));
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
var ContentItem = BaseViews.BaseListNodeItemView.extend({
	template: require("./hbtemplates/content_list_item.handlebars"),
	tagName: "li",
	indent: 0,
	selectedClass: "content-selected",
	'id': function() {
		return this.model.get("id");
	},
	className: "content draggable to_publish",
	initialize: function(options) {
		_.bindAll(this, 'open_folder');
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
		/* Step 3: Make sure any sub content lists are updated as well */
			this.$el.removeClass("content-selected");
			// (this.subcontent_view)? this.subcontent_view.render();
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
		this.set_opened(true);
	},
	set_opened:function(is_opened){
		(is_opened)? this.$el.addClass("current_topic") : this.$el.removeClass("current_topic");
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
		var preview_view = (this.edit_mode)? this.open_edit() : new Previewer.PreviewModalView(data);
	}
});


module.exports = {
	TreeEditView: TreeEditView
}