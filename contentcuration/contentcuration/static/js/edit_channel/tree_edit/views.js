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
				DragHelper.removeDragDrop(this.containers[this.containers.length-1]);
				this.containers[this.containers.length-1].delete_view();
				this.containers.splice(this.containers.length-1);
			}
		}
		
		this.$el.find("#container_area").append("<div id='container_" + topic.id + "' class='container content-container "
						+ "' name='" + (this.containers.length + 1) + "'></div>");
		//this.$el.find(".content-container").css("z-index", 10000);
		var container_view = new ContentList({
			el: this.$el.find("#container_area #container_" + topic.id),
			model: topic, 
			index: this.containers.length + 1,
			edit_mode: this.is_edit_page,
			collection: this.collection,
			container : this,
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
		var clipboard_root = this.topictrees.get({id : window.current_channel.clipboard}).get("root_node");
		var list = this.$el.find('input:checked').parent("li");
		var clipboard_list = new Models.NodeCollection();
		for(var i = 0; i < list.length; i++){
			var content = $(list[i]).data("data").model.duplicate(clipboard_root);
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
		this.container = options.container;
		this.collection = options.collection.get_all_fetch(this.model.get("children"));
		this.topictrees = options.topictrees
		this.set_sort_orders();
		this.render();
		this.listenTo(this.collection, "sync", this.prerender);
        this.listenTo(this.collection, "remove", this.prerender);
        this.lock = false;
		/* Set up animate sliding in from left */
		//this.$el.css("z-index", -1000);
		this.$el.css('margin-left', -this.$el.find(".container-interior").outerWidth());
		$("#container_area").width(this.$el.find(".container-interior").outerWidth() * (this.index + 2));
		
		/* Animate sliding in from left */
		this.$el.animate({'margin-left' : "0px"}, 500);
		//$("#container_area").find(".container-interior").css("z-index","0");		

	},
	prerender:function(){
		console.log("Change detected...");
		this.render();
	},
	render: function() {
		if(!this.lock){
			//this.collection.save();
			console.log("rendering list for " + this.model.get("title") + " with collection", this.collection);
			DragHelper.removeDragDrop(this);
			this.collection.sort_by_order();
			this.$el.html(this.template({
				topic: this.model, 
				edit_mode: this.edit_mode, 
				index: this.index,
				content_list: this.collection.toJSON(),
			}));

			this.load_content();
			this.$el.data("container", this);
			this.$el.find(".default-item").data("data", {
				containing_list_view: this, 
				index:0,
			});
			DragHelper.addDragDrop(this);
			console.log("end rendering list");
		}
	},

	events: {
		'click .add_content_button':'add_content',
	},

	set_sort_orders: function(){
		console.log("set_sort_orders");
		this.lock = true;
		var index = 1;
		var self = this;
		$(this.collection).each(function(){
			if(self.model.get("children").indexOf(this.id) >= 0)
				this.save({'sort_order' : index++}, {async:false, success:function(){console.log("cycle done here");}});
		});
		this.lock = false;
		console.log("cycle end set_sort_orders");
	},

	load_content : function(){
		console.log("load_content", this.collection);
		this.views = [];
		var self = this;
		var edit_mode = this.edit_mode;
		var el = this.$el.find(".content-list");
		var index = 0;
		var current_node = this.current_node;

		this.collection.forEach(function(entry){
			var file_view = new ContentItem({
				el: el.find("#" + entry.id),
				model: entry, 
				edit_mode: edit_mode,
				containing_list_view:self,
				allow_edit: false,
				index : index
			});
			index++;
			if(current_node && entry.id == current_node){
				file_view.set_opened(true, false);
			}
			self.views.push(file_view);
		});
		console.log("end load_content");
	},

	add_content: function(event){ 
		console.log("add_content");
		$("#main-content-area").append("<div id='dialog'></div>");
		var new_collection = new Models.NodeCollection();
		var add_view = new UploaderViews.AddContentView({
			el : $("#dialog"),
			collection: new_collection,
			main_collection: this.collection,
			parent_view: this,
			root: this.model
		});
		console.log("end add_content");
	},

	add_container:function(view){
		this.current_node = view.model.id;
		this.container.add_container(this.index, view.model);
	},

	close_folders:function(){
		console.log("close_folders");
		this.$el.find(".folder").css({
			"width": "302px",
			"background-color": "white",
			"border" : "none"
		});
		$(this.views).each(function(){
			this.set_opened(false, false);
		});

		this.$el.find(".folder .glyphicon").css("display", "inline-block");
		console.log("end close_folders");
	},

	add_to_container: function(transfer, target){
		console.log("add_to_container");
		//console.log("before", transfer);
		//console.log("closest", closestElement);
		//console.log("views", this.views);


		var new_sort_order = 1; 

		if(target.data("data") && this.views.length > 0){ //Case 1: Remains at 1 if no items in list
			console.log("add_to_container called inside with " + this.views.length + " views");
			var element = target.data("data");
			
			if(this.views.length == 1){ //Case 2: one item in list
				new_sort_order =  (target.data("isbelow"))? element.model.get("sort_order") / 2 : element.model.get("sort_order") + 1;
			}else{
				var first_index = element.index;
				var second_index = (target.data("isbelow"))? element.index - 1 : element.index + 1;

				if(first_index == 0 && target.data("isbelow")){ //Case 3: at top of list
					console.log("add_to_container inserting at top of list");
					new_sort_order = this.views[first_index].model.get("sort_order") / 2;
				}
				else if(first_index == this.views.length -1 && !target.data("isbelow")){ //Case 4: at bottom of list
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
				console.log("add_to_container index is " + element.index, new_sort_order);
			}
		}


		console.log("add_to_container sort order " + new_sort_order);

		var self=this;
		window.transfer_data.save({
			parent: this.model.id, 
			title: transfer.model.get("title"),
			sort_order: new_sort_order
		});
		console.log("add_to_container before", this.collection);
		if(transfer.containing_list_view.collection != this.collection){
			console.log("add_to_container transferring to different container");
			transfer.containing_list_view.collection.remove(transfer.model);
			this.collection.add(transfer.model);
		}
		console.log("add_to_container after", this.collection);
		this.render();
			
		console.log("end add_to_container");
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
		this.index = options.index;
		this.render();
		
		console.log(this.model.get("title") + " index is " + this.index);
	},
	render:function(){
		this.$el.html(this.template({
			node: this.model,
			isfolder: this.model.get("kind").toLowerCase() == "topic",
			edit_mode: this.edit_mode,
			allow_edit: this.allow_edit
		}));

		if(this.$el.find(".description").height() > 103){
			//this.$el.find(".description").height(this.$el.find(".description").css("font-size").replace("px", "") * 3);
			console.log(this.model.get("title"), this.$el.find(".description").height());
			this.$el.find(".filler").css("display", "inline");
			//this.$el.find(".description").
		}
		if($("#hide_details_checkbox").attr("checked"))
			this.$el.find("label").addClass("hidden_details");
		this.$el.data("data", this);
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
		event.stopPropagation();
		console.log("open_folder");
		this.containing_list_view.close_folders();
		this.set_opened(true, true);
		this.containing_list_view.add_container(this);
		console.log("end open_folder");
	},
	set_opened:function(is_opened, animate){
		if(is_opened){
			this.$el.addClass("current_topic");
			
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
		}else{
			this.$el.off("offset_changed");
			this.$el.attr("draggable", "true");
			this.$el.removeClass("current_topic");
		}
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