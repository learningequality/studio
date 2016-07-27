var Backbone = require("backbone");
var _ = require("underscore");
require("content-container.less");
var BaseViews = require("./../views");
//var PreviewerViews = require("edit_channel/previewer/views");
var QueueView = require("edit_channel/queue/views");
var DragHelper = require("edit_channel/utils/drag_drop");
var UploaderViews = require("edit_channel/uploader/views");
var ShareViews = require("edit_channel/share/views");
var Previewer = require("edit_channel/preview/views");
var Import = require("edit_channel/import/views");

//var UndoManager = require("backbone-undo");
var Models = require("./../models");

/* Main view for all draft tree editing */
var TreeEditView = BaseViews.BaseView.extend({
	container_index: 0,
	containers:[],
	template: require("./hbtemplates/container_area.handlebars"),
	dropdown_template: require("./hbtemplates/channel_dropdown.handlebars"),
	initialize: function(options) {
		_.bindAll(this, 'copy_content','delete_content' , 'add_container', 'edit_content', 'toggle_details', 'back_to_edit', 'handle_checked', 'edit_permissions' /*,'undo_action', 'redo_action'*/);
		this.is_edit_page = options.edit;
		this.collection = options.collection;
		this.is_clipboard = options.is_clipboard;

		this.render();
	},
	render: function() {
		var self=this;
		this.display_load("Loading Content...", function(resolve, reject){
			self.$el.html(self.template({
				edit: self.is_edit_page,
				channel : window.current_channel.toJSON(),
				is_clipboard : self.is_clipboard
			}));
			if(self.is_clipboard){
				$("#secondary-nav").css("display","none");
				$("#channel-edit-content-wrapper").css("background-color", "#EDDEED");
			}
			self.add_container(self.containers.length, self.model);
			$("#channel-edit-content-wrapper").data("data", self);
			self.queue_view = new QueueView.Queue({
		 		el: $("#queue-area"),
		 		collection: self.collection
		 	});
		 	$("#queue-area").css("display", (self.is_clipboard || !self.is_edit_page)? "none" : "block");
		 	$("#main-nav-home-button").removeClass("active");

		 	if(self.is_edit_page){
				$("#channel-edit-button").addClass("active");
		 	}else if(!self.is_clipboard){
		 		$("#channel-preview-button").addClass("active");
		 	}

		 	$("#channel_select_dd_wrapper").html(self.dropdown_template({
				channel_list: window.channels.toJSON(),
				current_channel: window.current_channel.toJSON()
			}));
			self.handle_checked();
			resolve("Success!");
		});

	},
	events: {
		'click .copy_button' : 'copy_content',
		'click .delete_button' : 'delete_content',
		'click .edit_button' : 'edit_content',
		'click #hide_details_checkbox' :'toggle_details',
		'click .back_to_edit_button' : 'back_to_edit',
		'change input[type=checkbox]' : 'handle_checked',
		'click .permissions_button' : 'edit_permissions'
	},
	back_to_edit:function(){
		window.location = window.location.href.replace("clipboard", "edit");
	},
	remove_containers_from:function(index){
		while(this.containers.length > index){
			this.$el.find("#container_area").width(this.$el.find("#container_area").width() - this.containers[0].$el.outerWidth());  //this.containers[this.containers.length-2].$el.outerWidth() * (this.containers.length-2));
			this.containers[this.containers.length-1].delete_view();
			this.containers.splice(this.containers.length-1);
		}
		this.containers[this.containers.length-1].close_folders();
		this.handle_checked();
	},
	add_container: function(index, topic){
		/* Close directories of children and siblings of opened topic*/
		if(index < this.containers.length){
			this.remove_containers_from(index);
		}
		/* Create place for opened topic */
		var container_view = new ContentList({
			model: topic,
			index: this.containers.length + 1,
			edit_mode: this.is_edit_page,
			collection: this.collection,
			container : this
		});
		this.containers.push(container_view);
		this.$("#container-wrapper").scrollLeft(this.$("#container_area").width());
		this.$el.find("#container_area").append(container_view.el);
		this.$el.find("#container_area").width(this.$el.find("#container_area").width() + this.containers[0].$el.outerWidth());
		/* Animate sliding in from left */
		container_view.$el.css('margin-left', -container_view.$el.outerWidth());
		container_view.$el.animate({
			'margin-left' : "0px"
		}, 500);
		return container_view;
	},

	delete_content: function (event){
		if(confirm("Are you sure you want to delete these selected items?")){
			var self = this;
			this.display_load("Deleting Content...", function(resolve, reject){
				try{
					for(var i = 0; i < self.containers.length; i++){
						if(self.containers[i].delete_selected()){
							self.remove_containers_from(self.containers[i].index);
							break;
						}
					}
					resolve("Success!");
				}catch(error){
					reject(error);
				}

			});
		}
	},
	copy_content: function(event){
		var self = this;
		this.display_load("Copying Content...", function(resolve, reject){
			try{
				for(var i = 0; i < self.containers.length; i++){
					if(self.containers[i].copy_selected()){
						break;
					}
				}
				resolve("Success!");
			}catch(error){
				reject(error);
			}

		});
	},
	edit_content: function(event){
		this.edit_selected();
	},
	toggle_details:function(event){
		/*TODO: Debug more with editing and opening folders*/
		this.$el.find("#container_area").toggleClass("hidden_details");
	},
	add_to_trash:function(collection){
		this.queue_view.add_to_trash(collection);
	},
	add_to_clipboard:function(collection){
		this.queue_view.render();
		//this.queue_view.add_to_clipboard(collection);
	},
	handle_checked:function(){
		var checked_count = this.$el.find(".content input[type=checkbox]:checked").length;
		if(checked_count > 0){
			this.$("#disable-none-selected-wrapper").removeClass("disabled-wrapper");
			this.$(".disable-none-selected").prop("disabled", false);

		}else{
			this.$("#disable-none-selected-wrapper").addClass("disabled-wrapper");
			this.$(".disable-none-selected").prop("disabled", true);
		}

	},
	edit_permissions:function(){
		var share_view = new ShareViews.ShareModalView({
			model:window.current_channel,
			current_user: window.current_user.toJSON()
		});
	}
});

/* Open directory view */
var ContentList = BaseViews.BaseListView.extend({
	item_view: "node",
	template: require("./hbtemplates/content_container.handlebars"),
	current_node : null,
	tagName: "li",
	item_class:"content",
	indent: 0,
	'id': function() {
		return "container_" + this.model.get("id");
	},
	className: "container content-container",
	initialize: function(options) {
		_.bindAll(this, 'add_topic','import_content','close_container','import_nodes','add_topic', 'create_new_item',
						'add_files','handle_transfer_drop','update_name','check_number_of_items_in_list', 'drop_in_container');
		this.index = options.index;
		this.lock = true;
		this.edit_mode = options.edit_mode;
		this.container = options.container;
		this.collection = options.collection;
		this.childrenCollection = this.collection.get_all_fetch(this.model.get("children"));
		this.childrenCollection.sort_by_order();
		this.render();

	},
	render: function() {
		var self = this;
		// DragHelper.removeDragDrop(this);
		this.model.fetch({
			success:function(model){
				self.childrenCollection = self.collection.get_all_fetch(self.model.get("children"));
				self.childrenCollection.sort_by_order();
				self.$el.html(self.template({
					topic: self.model,
					title: (self.model.get("parent"))? self.model.get("title") : window.current_channel.get("name"),
					edit_mode: self.edit_mode,
					index: self.index,
					content_list: self.childrenCollection.toJSON()
				}));
				self.load_content();
				self.$el.data("container", self);
				self.$el.find("ul").data("list", self);
				self.$el.find(".default-item").data("data", {
					containing_list_view: self,
					index:0
				});
				DragHelper.addSortable(self, self.drop_in_container);
			},
			error:function(obj, error){
				console.log("Error loading content", obj);
                console.log("Error message:", error);
                console.trace();
			}
		});
	},

	events: {
		'click .create_new_button':'add_topic',
		'click .import_button':'import_content',
		'click .back_button' :'close_container',
		'click .upload_files_button': 'add_files'
	},

	load_content : function(){
		this.views = [];
		var self = this;
		var el = this.$el.find(".content-list");
		this.list_index = 0;
		this.childrenCollection.forEach(function(entry){
			var file_view = new ContentItem({
				//el: el.find("#" + entry.id),
				model: entry,
				edit_mode: self.edit_mode,
				containing_list_view:self,
				allow_edit: false,
				index : self.list_index++
			});
			el.append(file_view.el);
			if(self.current_node && entry.id == self.current_node)
				file_view.set_opened(true, false);
			self.views.push(file_view);

		});
		self.check_number_of_items_in_list();
	},
	add_container:function(view){
		this.current_node = view.model.id;
		return this.container.add_container(this.index, view.model);
	},

	/* Resets folders to initial state */
	close_folders:function(){
		this.views.forEach(function(entry){
			entry.set_opened(false);
		});
	},
	add_to_trash:function(collection){
		var self = this;
		this.container.add_to_trash(collection);
		this.model.fetch();
	},
	add_to_clipboard:function(collection){
		this.container.add_to_clipboard(collection);
	},
	close_container:function(views){
		var self = this;
		this.$el.animate({'margin-left' : -this.$el.outerWidth()}, 100,function(){
			self.container.remove_containers_from(self.index - 1);
		});
	},

    update_name:function(container_name){
    	this.$el.find(".container-title").text(container_name);
    },
    check_number_of_items_in_list:function(){
    	this.$el.find(".default-item").css("display", (this.views.length === 0) ? "block" : "none");
    },
    create_new_item:function(model){
    	return new ContentItem({
					model: model,
					edit_mode: this.edit_mode,
					containing_list_view:this,
					allow_edit: false,
					index : this.list_index++
				});
    }
});


/*folders, files, exercises listed*/
var ContentItem = BaseViews.BaseListNodeItemView.extend({
	template: require("./hbtemplates/content_list_item.handlebars"),
	tagName: "li",
	indent: 0,
	'id': function() {
		return this.model.get("id");
	},
	className: "content draggable to_publish",
	initialize: function(options) {
		_.bindAll(this, 'edit_folder','open_folder',/*'expand_or_collapse_folder', */
					'submit_edit', 'cancel_edit','preview_node', 'cancel_open_folder', 'handle_checked');
		this.edit_mode = options.edit_mode;
		this.allow_edit = options.allow_edit;
		this.containing_list_view = options.containing_list_view;
		this.index = options.index;
		this.render();
	},

	render:function(){
		this.$el.html(this.template({
			node: this.model,
			isfolder: this.model.get("kind").toLowerCase() == "topic",
			edit_mode: this.edit_mode,
			allow_edit: this.allow_edit
		}));
		this.$el.data("data", this);
		if($("#hide_details_checkbox").attr("checked"))
			this.$el.find("label").addClass("hidden_details");
	},
	reload:function(){
		var self = this;
		this.model.fetch({
			success:function(model){
				self.render();
				if(self.sub_content_list){
					self.sub_content_list.update_name(model.get("title"));
					self.sub_content_list.assign_indices();
					self.sub_content_list.check_number_of_items_in_list();
				}
				self.containing_list_view.container.handle_checked();
			}
		});

	},
	events: {
		'click .edit_folder_button': 'edit_folder',
		'click .node_title_textbox': 'cancel_open_folder',
		'click .topic_textarea' : 'cancel_open_folder',
		'click .open_folder':'open_folder',
		'click .folder' : "open_folder",
		'click .cancel_edit' : 'cancel_edit',
		'click .submit_edit' : 'submit_edit',
		'click .preview_button': 'preview_node',
		'click .file' : 'preview_node',
		'change input[type=checkbox]': 'handle_checked'
	},
	open_folder:function(event){
		event.preventDefault();
		event.stopPropagation();
		this.containing_list_view.close_folders();
		this.sub_content_list = this.containing_list_view.add_container(this);
		this.set_opened(true);
	},
	cancel_open_folder:function(event){
		event.preventDefault();
		event.stopPropagation();
	},
	set_opened:function(is_opened){
		if(is_opened){
			this.$el.addClass("current_topic");
			this.$el.attr("draggable", "false");
		}else{
			this.$el.attr("draggable", "true");
			this.$el.removeClass("current_topic");
		}
	},
	edit_folder: function(event){
		event.preventDefault();
		event.stopPropagation();
		this.open_edit();
	},
	submit_edit: function(event){
		event.preventDefault();
		event.stopPropagation();
		var title = ($("#textbox_" + this.model.id).val().trim() == "")? "Untitled" : $("#textbox_" + this.model.id).val().trim();
		var description = ($("#textarea_" + this.model.id).val().trim() == "")? " " : $("#textarea_" + this.model.id).val().trim();
		this.model.set({title:title, description:description}, {validate:true});
		if(this.model.validationError){
			this.$el.find(".node_title_textbox").addClass("error_input");
			this.$el.find(".error_msg").html(this.model.validationError);
		}
		else{
			this.save();
			this.allow_edit = false;
			this.$el.removeClass("editing");
			this.render();
		}

	},
	cancel_edit: function(event){
		event.preventDefault();
		event.stopPropagation();
		this.allow_edit = false;
		this.render();
		if($("#hide_details_checkbox").attr("checked")){
			this.$el.find("label").removeClass("editing");
			this.$el.find("label").addClass("hidden_details");
		}
	},
	preview_node: function(event){
		event.preventDefault();
		$("#main-content-area").append("<div id='dialog'></div>");
		if(this.edit_mode){
			var metadata_view = new UploaderViews.EditMetadataView({
				el : $("#dialog"),
				model: this.model,
				allow_add: false,
				main_collection : this.main_collection,
				modal: true,
				parent_view : this
			});
		}else{
			var preview_view = new Previewer.PreviewView({
				modal:true,
				model: this.model,
				el : $("#dialog")
			});
		}
	},
	add_to_trash:function(){
		this.containing_list_view.add_to_trash([this]);
		this.delete_view();
	},
	handle_checked:function(){
		this.$el.toggleClass("content-selected");
	}
});

module.exports = {
	TreeEditView: TreeEditView
}