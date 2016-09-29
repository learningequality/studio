var Backbone = require("backbone");
var Models = require("./../models");
var _ = require("underscore");
require("content-container.less");
var BaseViews = require("./../views");
var DragHelper = require("edit_channel/utils/drag_drop");

/**
 * Main view for all draft tree editing
 * @param {ContentNodeModel} model (root of channel)
 * @param {ContentNodeCollection} collection
 * @param {boolean} is_clipboard (determines how to render screen)
 * @param {boolean} is_edit_page (determines if previewing or editing)
 */
var TreeEditView = BaseViews.BaseWorkspaceView.extend({
	lists: [],
	template: require("./hbtemplates/container_area.handlebars"),
	dropdown_template: require("./hbtemplates/channel_dropdown.handlebars"),
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
		this.$el.html(this.template({
			edit: this.is_edit_page,
			channel : window.current_channel.toJSON(),
			is_clipboard : this.is_clipboard
		}));
		if(this.is_clipboard){
			$("#secondary-nav").css("display","none");
			$("#channel-edit-content-wrapper").css("background-color", "#EDDEED");
		}
		window.workspace_manager.set_main_view(this);
		this.check_if_published(this.model);
		this.handle_checked();
		$("#main-nav-home-button").removeClass("active");

		(this.is_edit_page) ? $("#channel-edit-button").addClass("active") : $("#channel-preview-button").addClass("active");

	 	$("#channel_select_dd_wrapper").html(this.dropdown_template({
			channel_list: window.channels.toJSON(),
			current_channel: window.current_channel.toJSON()
		}));
		this.add_container(this.lists.length, this.model);
	},
	add_container: function(index, topic, view = null){
		/* Step 1: Close directories of children and siblings of opened topic*/
			if(index < this.lists.length){
				this.remove_containers_from(index);
			}
		/* Step 2: Create new container */
			this.$("#container-wrapper").scrollLeft(this.$("#container_area").width());
			var container_view = new ContentList({
				model: topic,
				index: this.lists.length + 1,
				edit_mode: this.is_edit_page,
				collection: this.collection,
				container : this,
				content_node_view: view
			});
			this.lists.push(container_view);
			var self = this;
			setTimeout(function(){
				self.$("#container_area").width(self.$("#container_area").width() + self.lists[0].$el.width());
			}, 400)

		/* Step 3: Add container to DOM */
			this.$("#container_area").append(container_view.el);
			return container_view;
	},
	remove_containers_from:function(index){
		while(this.lists.length > index){
			this.$el.find("#container_area").width(this.$el.find("#container_area").width() - this.lists[0].$el.width());
			this.lists[this.lists.length -1].remove();
			this.lists.splice(this.lists.length-1);
		}
		this.lists[this.lists.length-1].close_folders();
		this.handle_checked();
	},
	handle_checked:function(){
		var checked_count = this.$el.find(".content input[type=checkbox]:checked").length;
		this.$(".disable-none-selected").prop("disabled", checked_count === 0);
		(checked_count > 0)? this.$("#disable-none-selected-wrapper").removeClass("disabled-wrapper") : this.$("#disable-none-selected-wrapper").addClass("disabled-wrapper");
	},
	toggle_details:function(event){
		this.$("#container_area").toggleClass("hidden_details");
	},
	delete_content: function (event){
		if(confirm("Are you sure you want to delete these selected items?")){
			var deleteCollection = new Models.ContentNodeCollection();
			for(var i = 0; i < this.lists.length; i++){
				var list = this.lists[i].get_selected();
				for(var j = 0; j < list.length; j++){
					var view = list[j];
					if(view){
						deleteCollection.add(view.model);
						view.remove();
					}
				}
				if(this.lists[i].current_node){
					this.remove_containers_from(this.lists[i].index);
						break;
    			}
			}
			this.add_to_trash(deleteCollection, "Deleting Content...");
		}
	},
	copy_content: function(event){
		var self = this;
		this.display_load("Copying Content...", function(load_resolve, load_reject){
			var promises = [];
			for(var i = 0; i < self.lists.length; i++){
				promises.push(self.lists[i].copy_selected());
				if(self.lists[i].current_node){
					break;
				}
			}
			Promise.all(promises).then(function(lists){
				var nodeCollection = new Models.ContentNodeCollection();
				lists.forEach(function(list){
					nodeCollection.add(list.models);
				});
				window.workspace_manager.get_queue_view().clipboard_queue.add_nodes(nodeCollection);
				load_resolve("Success!");
			}).catch(function(error){
				console.log(error);
				load_reject(error);
			});
		});
	},
	close_all_popups:function(){
		$('.content-options-dropdown').each(function() {
            $(this).popover('hide');
            $(this).removeClass("active-popover");
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
	selectedClass: "content-selected",
	openedFolderClass: "current_topic",
	item_class_selector: ".content-item",

	'id': function() {
		return "list_" + this.model.get("id");
	},
	className: "container content-container pre_animation",

	initialize: function(options) {
		_.bindAll(this, 'close_container', 'update_name', 'create_new_view');
		this.bind_workspace_functions();
		this.index = options.index;
		this.edit_mode = options.edit_mode;
		this.container = options.container;
		this.collection = options.collection;
		this.content_node_view = options.content_node_view;
		this.current_model = null;
		this.render();
		this.listenTo(this.model, 'change:title', this.update_name);
		this.listenTo(this.model, 'change:children', this.update_views);
	},
	events: {
		'click .create_new_button':'add_topic',
		'click .import_button':'import_content',
		'click .back_button' :'close_container',
		'click .upload_files_button': 'add_files',
		'click .create_exercise_button' : 'add_exercise'
	},
	render: function() {
		this.$el.html(this.template({
			topic: this.model.toJSON(),
			title: (this.model.get("parent"))? this.model.get("title") : window.current_channel.get("name"),
			edit_mode: this.edit_mode,
			index: this.index,
		}));
		window.workspace_manager.put_list(this.model.get("id"), this);
		var self = this;
		self.make_droppable();
		this.retrieve_nodes(this.model.get("children")).then(function(fetchedCollection){
			self.$el.find(this.default_item).text("No items found.");
			fetchedCollection.sort_by_order();
			self.load_content(fetchedCollection);
			self.refresh_droppable();
		});
		setTimeout(function(){
			self.$el.removeClass("pre_animation").addClass("post_animation");
			setTimeout(function(){
				self.$el.removeClass("post_animation");
			}, 350);
		}, 100);
	},
	update_name:function(){
		this.$el.find(".container-title").text(this.model.get("title"));
	},
	add_container:function(view){
		this.current_node = view.model.id;
		return this.container.add_container(this.index, view.model, view);
	},
  /* Resets folders to initial state */
	close_folders:function(){
		this.$el.find("." + this.openedFolderClass).removeClass(this.openedFolderClass);
		this.set_current(null);
	},
	close_container:function(){
		var self = this;
		this.$el.addClass("remove_animation");
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
	  if(this.current_model && model.id === this.current_model.id){
	  	newView.$el.addClass("current_topic");
	  }
		return newView;
	},
	set_current:function(model){
		this.current_model = model;
	},
	close_all_popups:function(){
		this.container.close_all_popups();
	}
});

/*folders, files, exercises listed*/
// model (ContentNodeModel): node that is being displayed
// edit_mode (boolean): tells how to render ui
// containing_list_view (ContentList): list item is contained in
// resolve (function): function to call when completed rendering
// reject (function): function to call if failed to render
var ContentItem = BaseViews.BaseWorkspaceListNodeItemView.extend({
	template: require("./hbtemplates/content_list_item.handlebars"),
	options_template:require("./hbtemplates/content_list_item_options.handlebars"),
	selectedClass: "content-selected",
	openedFolderClass: "current_topic",
	'id': function() {
		return this.model.get("id");
	},
	className: "content draggable to_publish",
	initialize: function(options) {
		_.bindAll(this, 'open_folder','preview_node', 'copy_node' , 'delete_node', 'add_new_subtopic', 'open_context_menu');
		this.bind_workspace_functions();
		this.edit_mode = options.edit_mode;
		this.containing_list_view = options.containing_list_view;
		this.render();
		this.isSelected = false;
		this.listenTo(this.model, 'change:metadata', this.render);
	},
	render:function(){
		this.$el.html(this.template({
			node: this.model.toJSON(),
			isfolder: this.model.get("kind") === "topic",
			edit_mode: this.edit_mode,
			checked: this.checked,
			isexercise: this.model.get("kind") === "exercise"
		}));
		this.handle_checked();
		if(this.isSelected){
			this.$el.addClass(this.openedFolderClass);
		}
		window.workspace_manager.put_node(this.model.get("id"), this);
		this.make_droppable();
		this.$el.removeClass(this.selectedClass);
		this.create_popover();
	},
	create_popover:function(){
		var self = this;
		this.$el.find(".content-options-dropdown").popover({
			animation:false,
			trigger:"manual",
			html: true,
			selector: '[rel="popover"]',
			content: function () {
		        return $("#options_" + self.model.get("id")).html();
		    }
		}).click(function(event){
			var hadClass = $(this).hasClass("active-popover");
			self.containing_list_view.close_all_popups();
			if(!hadClass){
				$(this).popover('show');
	        	$(this).addClass("active-popover");
			}
	        event.preventDefault();
	        event.stopPropagation();
		});
	},
	events: {
		'click .edit_item_button': 'open_edit',
		'click .open_folder':'open_folder',
		'click .open_file' : 'preview_node',
		'change input[type=checkbox]': 'handle_checked',
		'click .delete_item_button' : 'delete_node',
		'click .copy_item_button': 'copy_node',
		'click .add_subtopic_item_button': 'add_new_subtopic',
		'contextmenu .list_item_wrapper' : 'open_context_menu'
	},
	open_context_menu:function(event){
		if( event.button == 2 ) {
			this.cancel_actions(event);
			var contextmenu = this.$(".context-menu");
			contextmenu.addClass("init");
			contextmenu.offset({
				left: event.pageX + 5,
				top: event.pageY + 5,
			});
			contextmenu.focus();
			contextmenu.removeClass("init");
		}
	},
	open_folder:function(event){
		this.cancel_actions(event);
		if(!this.$el.hasClass(this.openedFolderClass)){
			this.containing_list_view.close_folders();
			this.subcontent_view = this.containing_list_view.add_container(this);
			this.$el.addClass(this.openedFolderClass);
			this.containing_list_view.set_current(this.model);
		}
	},
	preview_node: function(event){
		this.cancel_actions(event);
		(this.edit_mode)? this.open_edit(event) : this.open_preview();
	},
	copy_node:function(event){
		this.cancel_actions(event);
		this.copy_item();
	},
	delete_node:function(event){
		this.cancel_actions(event);
		if(confirm("Are you sure you want to delete " + this.model.get("title") + "?")){
			this.add_to_trash();
			if(this.subcontent_view){
				this.subcontent_view.close_container();
			}
		}
	},
	add_new_subtopic:function(event){
		this.cancel_actions(event);
		this.add_topic();
	}
});

module.exports = {
	TreeEditView: TreeEditView
}