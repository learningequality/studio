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
		var self = this;
		var container_view = null;
		var promise = new Promise(function(resolve, reject){
			/* Create place for opened topic */
			container_view = new ContentList({
				model: topic,
				index: self.containers.length + 1,
				edit_mode: self.is_edit_page,
				collection: self.collection,
				container : self,
				resolve:resolve,
				reject:reject
			});
			self.containers.push(container_view);
			self.$("#container-wrapper").scrollLeft(self.$("#container_area").width());
			self.$el.find("#container_area").append(container_view.el);
			self.$el.find("#container_area").width(self.$el.find("#container_area").width() + self.containers[0].$el.outerWidth());
			/* Animate sliding in from left */
			container_view.$el.css('margin-left', -container_view.$el.outerWidth());
		});
		promise.then(function(){
			DragHelper.addSortable(container_view, 'content-selected', container_view.drop_in_container);
			setTimeout(function(){
				$( ".content-list" ).sortable( "refresh" );
				$( ".content-list" ).sortable( "enable" );
			}, 500);
			container_view.$el.animate({
				'margin-left' : "0px"
			}, 500);
		});
		return container_view;
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
					}).catch(function(error){
						reject(error);
					});
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
				}).catch(function(error){
					reject(error);
				});
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
	add_to_trash:function(collection, resolve, reject){
		this.queue_view.add_to_trash(collection, resolve, reject);
	},
	add_to_clipboard:function(collection, resolve, reject){
		this.queue_view.render();
		resolve(true);
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
		this.resolve = options.resolve;
		this.reject = options.reject;
		this.render(this.resolve, this.reject);

	},
	render: function(resolve, reject) {
		var self = this;
		this.model.fetch({
			success:function(model){
				var promise = new Promise(function(resolve, reject){
					self.childrenCollection = self.collection.get_all_fetch(self.model.get("children"));
					self.childrenCollection.sort_by_order();
					self.$el.html(self.template({
						topic: self.model,
						title: (self.model.get("parent"))? self.model.get("title") : window.current_channel.get("name"),
						edit_mode: self.edit_mode,
						index: self.index,
						content_list: self.childrenCollection.toJSON()
					}));
					self.load_content(resolve, reject);
				});
				promise.then(function(){
					$("#loading_modal").remove();
				}).catch(function(error){
					reject(error);
				});

				self.$el.data("container", self);
				self.$el.find("ul").data("list", self);
				self.$el.find(".default-item").data("data", {
					containing_list_view: self,
					index:0
				});
				DragHelper.addSortable(self, 'content-selected', self.drop_in_container);
				if(resolve){
					resolve(true);
				}

			},
			error:function(obj, error){
				if(reject){
					reject(error);
				}

			}
		});
	},

	events: {
		'click .create_new_button':'add_topic',
		'click .import_button':'import_content',
		'click .back_button' :'close_container',
		'click .upload_files_button': 'add_files'
	},

	load_content : function(resolve, reject){
		this.views = [];
		var self = this;
		var el = this.$el.find(".content-list");
		this.list_index = 0;
		var promises = [];

		self.childrenCollection.forEach(function(entry){
			var promise = new Promise(function(resolve, reject){
				var file_view = new ContentItem({
					//el: el.find("#" + entry.id),
					model: entry,
					edit_mode: self.edit_mode,
					containing_list_view:self,
					allow_edit: false,
					index : self.list_index++,
					resolve:resolve,
					reject:reject
				});
				el.append(file_view.el);
				if(self.current_node && entry.id == self.current_node)
					file_view.set_opened(true, false);
				self.views.push(file_view);
			});
		});

		Promise.all(promises).then(function(){
			self.check_number_of_items_in_list();
			resolve(true);
		}).catch(function(error){
			console.log("Error loading content", error);
    		console.trace();
		});
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
	add_to_trash:function(collection, resolve, reject){
		var self = this;
		var promise = new Promise(function(resolve, reject){
			self.container.add_to_trash(collection,resolve, reject);
		});
		promise.then(function(){
			self.model.fetch({
				success:function(model){
					resolve(model);
				}
			});
		}).catch(function(error){
			reject(error)
		});
	},
	add_to_clipboard:function(collection, resolve, reject){
		this.container.add_to_clipboard(collection, resolve, reject);
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
		_.bindAll(this, 'edit_folder','open_folder','hover_open_folder',
					'preview_node', 'handle_checked','handle_hover','handle_drop');
		this.edit_mode = options.edit_mode;
		this.allow_edit = options.allow_edit;
		this.containing_list_view = options.containing_list_view;
		this.index = options.index;
		this.resolve = options.resolve;
		this.reject = options.reject;
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
		if(this.model.get("kind") == "topic"){
			DragHelper.addTopicDragDrop(this, this.handle_hover, this.handle_drop);
		}
		if(this.resolve){
			this.resolve(true);
		}
		this.$el.removeClass("content-selected");
	},
	reload:function(){
		var self = this;
		this.model.fetch({
			success:function(model){
				self.render();
				if(self.sub_content_list){
					self.sub_content_list.render();
					// self.sub_content_list.update_name(model.get("title"));
					// // self.sub_content_list.assign_indices();
					// self.sub_content_list.check_number_of_items_in_list();
				}
				self.containing_list_view.container.handle_checked();
			}
		});

	},
	events: {
		'click .edit_folder_button': 'edit_folder',
		'click .open_folder':'open_folder',
		'click .folder' : "open_folder",
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
		var self = this;
		var promise = new Promise(function(resolve, reject){
			self.containing_list_view.add_to_trash([self]);
		});
		promise.then(function(){
			self.delete_view();
		}).catch(function(error){
			reject(error)
		});
	},
	handle_checked:function(){
		this.$el.toggleClass("content-selected");
	},
	hover_open_folder:function(event){
		this.open_folder(event);
	}
});

module.exports = {
	TreeEditView: TreeEditView
}