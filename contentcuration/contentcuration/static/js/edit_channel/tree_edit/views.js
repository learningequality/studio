var Backbone = require("backbone");
var _ = require("underscore");
require("content-container.less");
var BaseViews = require("./../views");
var UploaderViews = require("edit_channel/uploader/views");
var PreviewerViews = require("edit_channel/previewer/views");
var ClipboardView = require("edit_channel/clipboard/views");
var DragHelper = require("edit_channel/utils/drag_drop");
var Models = require("./../models");

var TreeEditView = BaseViews.BaseView.extend({
	container_index: 0,
	containers:[],
	content: [],
	template: require("./hbtemplates/container_area.handlebars"),
	topictrees: null,
	initialize: function(options) {
		_.bindAll(this, 'copy_content','delete_content' , 'add_container', 'edit_content', 'toggle_details');
		this.topictrees = options.topictrees;
		this.is_edit_page = options.edit;
		this.collection = options.collection;
		this.root = this.topictrees.get({id : window.current_channel.draft}).get_root();

		this.render();
		this.clipboard_view = new ClipboardView.ClipboardList({
	 		el: $("#clipboard-area"),
	 		topictrees: this.topictrees,
	 		collection: this.collection
	 	});
	},
	render: function() {
		this.$el.html(this.template({edit: this.is_edit_page}));
		this.add_container(this.containers.length, this.root);
	},
	events: {
		'click .copy_button' : 'copy_content',
		'click .delete_button' : 'delete_content',
		'click .edit_button' : 'edit_content',
		'click #hide_details_checkbox' :'toggle_details'
	},	
	add_container: function(index, topic){
		if(index < this.containers.length){
			while(this.containers.length > index){
				// TODO: Saving issues? 
				this.containers[this.containers.length-1].delete_view();
				this.containers.splice(this.containers.length-1);
			}
		}
		
		this.$el.find("#container_area").append("<li id='container_" + topic.id + "' class='container content-container "
						+ "pull-left' name='" + (this.containers.length + 1) + "'></li>");
		this.$el.find(".content-container").css("z-index", 10000);
		var container_view = new ContentList({
			el: this.$el.find("#container_area #container_" + topic.id),
			model: topic, 
			index: this.containers.length + 1,
			edit_mode: this.is_edit_page,
			collection: this.collection,
			containing_list_view : this,
			topictrees : this.topictrees
		});
		this.containers.push(container_view);
	},
	delete_content: function (event){
		if(confirm("Are you sure you want to delete the selected files?")){
			var list = this.$el.find('input:checked').parent("li");
			for(var i = 0; i < list.length; i++){
				$(list[i]).data("data").delete();
			}
		}
	},
	copy_content: function(event){
		var clipboard_root = this.topictrees.get({id : window.current_channel.clipboard}).get_root();
		var list = this.$el.find('input:checked').parent("li");
		var clipboard_list = new Models.NodeCollection();
		for(var i = 0; i < list.length; i++){
			var content = $(list[i]).data("data").model.duplicate(clipboard_root.id);
			console.log("content", content);
			content.fetch();
			clipboard_list.add(content);
		}
		this.clipboard_view.add_to_clipboard(clipboard_list);
	},	
	edit_content: function(event){
		var list = this.$el.find('input:checked').parent("li");
		var edit_collection = new Models.NodeCollection();
		for(var i = 0; i < list.length; i++){
			var model = $(list[i]).data("data").model;
			model.fetch();
			edit_collection.add(model);
		}
		$("#main-content-area").append("<div id='dialog'></div>");
		var metadata_view = new UploaderViews.EditMetadataView({
			collection: edit_collection,
			parent_view: this,
			el: $("#dialog"),
			allow_add : false,
			main_collection: this.collection,
		});
	},	
	toggle_details:function(event){
		this.$el.find("label").toggleClass("hidden_details");
	}
});

/* Open directory view */
var ContentList = BaseViews.BaseListView.extend({
	item_view: "node",
	template: require("./hbtemplates/content_container.handlebars"),
	current_node : null,
	initialize: function(options) {
		_.bindAll(this, 'add_content');	
		this.index = options.index;
		this.edit_mode = options.edit_mode;
		this.containing_list_view = options.containing_list_view;
		this.collection = options.collection.get_all_fetch(this.model.attributes.children);
		this.topictrees = options.topictrees

		this.render();
		this.listenTo(this.collection, "sync", this.render);
        this.listenTo(this.collection, "remove", this.render);
		/* Set up animate sliding in from left */
		this.$el.css("z-index", -1000);
		this.$el.css('margin-left', -this.$el.find(".container-interior").outerWidth());
		$("#container_area").width(this.$el.find(".container-interior").outerWidth() * (this.index + 2));
		
		/* Animate sliding in from left */
		this.$el.animate({'margin-left' : "0px"}, 500);
		$("#container_area").find(".container-interior").css("z-index","0");		
	},
	render: function() {
		this.collection.sort_by_order();
		this.$el.html(this.template({
			topic: this.model, 
			edit_mode: this.edit_mode, 
			index: this.index,
			content_list: this.collection.toJSON(),
		}));

		this.load_content();
		this.$el.data("data", this);
		DragHelper.handleDrop(this, "move");
	},

	events: {
		'click .add_content_button':'add_content',
	},

	load_content : function(){
		var containing_list_view = this;
		var edit_mode = this.edit_mode;
		var el = containing_list_view.$el.find(".content-list");
		var index = 0;
		var current_node = this.current_node;

		this.collection.forEach(function(entry){
			/*TODO FIX THIS!*/
			entry.set({sort_order : index++});
			var file_view = new ContentItem({
				el: el.find("#" + entry.id),
				model: entry, 
				edit_mode: edit_mode,
				containing_list_view:containing_list_view,
				allow_edit: false
			});
			if(current_node && entry.id == current_node){
				file_view.set_opened(false);
			}
			containing_list_view.views.push(file_view);
		});
	},

	add_content: function(event){
		$("#main-content-area").append("<div id='dialog'></div>");
		var new_collection = new Models.NodeCollection();
		var add_view = new UploaderViews.AddContentView({
			el : $("#dialog"),
			collection: new_collection,
			main_collection: this.collection,
			parent_view: this,
			root: this.model
		});
	},

	add_container:function(view){
		this.current_node = view.model.id;
		this.containing_list_view.add_container(this.index, view.model);
	},

	close_folders:function(){
		this.$el.find(".folder").css({
			"width": "302px",
			"background-color": "white",
			"border" : "none"
		});

		this.views.forEach(function(entry){
			entry.$el.off("offset_changed");
			entry.$el.attr("draggable", "true");
		});

		this.$el.find(".folder .glyphicon").css("display", "inline-block");
	},

	add_to_container: function(transfer){
		transfer.data.model.set({parent: this.model.id});
		transfer.data.save(this.model.attributes);
		transfer.data.containing_list_view.collection.remove(transfer.data.model);
		this.collection.add(transfer.data.model);
	}
});


/*folders, files, exercises listed*/
var ContentItem = BaseViews.BaseListItemView.extend({
	template: require("./hbtemplates/content_list_item.handlebars"),
	initialize: function(options) {
		_.bindAll(this, 'edit_folder','open_folder','expand_or_collapse_folder', 
					'submit_edit', 'cancel_edit','preview_node');
		this.edit_mode = options.edit_mode;
		this.allow_edit = options.allow_edit;
		this.containing_list_view = options.containing_list_view;
		this.render();
	},
	render:function(){
		this.$el.html(this.template({
			node: this.model,
			isfolder: this.model.attributes.kind.toLowerCase() == "topic",
			edit_mode: this.edit_mode,
			allow_edit: this.allow_edit
		}));
		this.$el.data("data", this);
		if(this.edit_mode) DragHelper.handleDrag(this, 'move');

		if(this.$el.find(".description").height() > 103){
			//this.$el.find(".description").height(this.$el.find(".description").css("font-size").replace("px", "") * 3);
			console.log(this.model.attributes.title, this.$el.find(".description").height());
			this.$el.find(".filler").css("display", "inline");
			//this.$el.find(".description").
		}
		if($("#hide_details_checkbox").attr("checked"))
			this.$el.find("label").addClass("hidden_details");
		
	},

	events: {
		'click .edit_folder_button': 'edit_folder',
		'click .open_folder':'open_folder',
		'dblclick .folder' : "open_folder",
		'click .filler' : 'expand_or_collapse_folder',
		'click .cancel_edit' : 'cancel_edit',
		'click .submit_edit' : 'submit_edit',
		'click .preview_button': 'preview_node',
		'click .file' : 'preview_node'
	},

	expand_or_collapse_folder: function(event){
		event.preventDefault();
		event.stopPropagation();
		if(this.$(".filler").parent("label").hasClass("collapsed")){
			this.$(".filler").parent("label").removeClass("collapsed").addClass("expanded");
			this.$(".description").text(this.$(".filler").attr("title"));
			this.$(".filler").text("See Less");
		}
		else {
			this.$(".filler").parent("label").removeClass("expanded").addClass("collapsed");
			this.$(".filler").text("See More");
		}
	},
	open_folder:function(event){
		event.preventDefault();
		this.containing_list_view.close_folders();
		this.set_opened(true);
		this.containing_list_view.add_container(this);
		
	},
	set_opened:function(animate){
		if(animate)
			this.$el.find(".folder").animate({'width' : "345px"}, 500);
		else
			this.$el.find(".folder").css('width',"345px");
		this.$el.find(".folder").css({
			'background-color': (this.edit_mode)? "#CCCCCC" : "#87A3C6",
			'border' : "4px solid white",
			'border-right' : 'none'
		});
		this.$el.find(".folder .glyphicon").css("display", "none");


		var view = this;
		this.$el.on("offset_changed", function(){
			var container = view.containing_list_view.$el;
			var interior = view.containing_list_view.$el.find(".container-interior");
			if(interior.offset().top > view.$el.offset().top + view.$el.height())
				container.find(".top_border").css("visibility", "visible");
			else if(interior.offset().top + interior.height() < view.$el.offset().top)
				container.find(".bottom_border").css("visibility", "visible");
			else
				container.find(".boundary").css("visibility", "hidden");
		});

		this.$el.onOffsetChanged(function(){
			 view.$el.trigger('offset_changed');
		});

		this.$el.attr("draggable", "false");
	},
	edit_folder: function(event){
		this.$el.find("label").removeClass("hidden_details");
		this.$el.find("label").addClass("editing");
		this.allow_edit = this.edit_mode;
		this.render();
	},
	submit_edit: function(event){
		var title = ($("#textbox_" + this.model.id).val().trim() == "")? "Untitled" : $("#textbox_" + this.model.id).val().trim();
		var description = ($("#textarea_" + this.model.id).val().trim() == "")? " " : $("#textarea_" + this.model.id).val().trim();
		this.save({title:title, description:description}, true);
		this.allow_edit = false;
		this.render();
	},
	cancel_edit: function(event){
		this.allow_edit = false;
		this.render();
		if($("#hide_details_checkbox").attr("checked")){
			this.$el.find("label").removeClass("editing");
			this.$el.find("label").addClass("hidden_details");
		}
	},
	preview_node: function(event){
		event.preventDefault();
		var view = new PreviewerViews.PreviewerView({
			el: $("#previewer-area"),
			model: this.model,
			file: this
		});
	}
}); 

/* onOffsetChanged: handles when selected folder is offscreen */
$.fn.onOffsetChanged = function (trigger, millis) {
    if (millis == null) millis = 100;
    var o = $(this[0]); // our jquery object
    if (o.length < 1) return o;

    var lastOff = null;
    setInterval(function () {
        if (o == null || o.length < 1) return o;
        if (lastOff == null) lastOff = o.offset();
        var newOff = o.offset();
        if (lastOff.top != newOff.top) {
            $(this).trigger('onOffsetChanged', { lastOff: lastOff, newOff: newOff});
            if (typeof (trigger) == "function") trigger(lastOff, newOff);
            lastOff= o.offset();
        }
    }, millis);

    return o;
};

module.exports = {
	TreeEditView: TreeEditView,
}