var Backbone = require("backbone");
var _ = require("underscore");
require("content-container.less");
var BaseViews = require("./../views");
var UploaderViews = require("edit_channel/uploader/views");
//var PreviewerViews = require("edit_channel/previewer/views");
var Models = require("./../models");


var TreeEditView = BaseViews.BaseView.extend({
	container_index: 0,
	containers:[],
	content: [],
	template: require("./hbtemplates/container_area.handlebars"),
	root: null,
	initialize: function(options) {
		_.bindAll(this, /*'copy_content',*/'delete_content' , 'add_container');
		this.root = options.root;
		this.is_edit_page = options.edit;
		console.log("div", this.$el);
		this.collection = new Models.NodeCollection();
		this.collection.add(this.root);
		this.render();
	},
	render: function() {
		this.$el.html(this.template({edit: this.is_edit_page}));
		this.add_container(this.containers.length, this.root);
	},
	events: {
	//	'click .copy_button' : 'copy_content',
		'click .delete_button' : 'delete_content',
	},	
	add_container: function(index, topic){
		if(index < this.containers.length){
			while(this.containers.length > index){
				// TODO: Saving issues? 
				this.containers[this.containers.length-1].delete_view();
				this.containers.splice(this.containers.length-1);
			}
		}
		this.$el.find("#container_area").width(this.$el.find("#container_area").width() * 2);
		this.$el.find("#container_area").append("<li id='container_" + topic.id + "' class='container content-container "
						+ "pull-left' name='" + (this.containers.length + 1) + "'></li>");
		this.$el.find(".content-container").css("position", "10000000px");
		var container_view = new ContainerView({
			el: this.$el.find("#container_area #container_" + topic.id),
			topic: topic, 
			edit: this.allow_edit, 
			index: this.containers.length + 1,
			edit_mode: this.is_edit_page,
			collection: this.collection,
			containing_list_view : this
		});
		this.$el.find(".content-container").css("z-index", "0px");
		this.containers.push(container_view);
		this.$el.find("#container_area").width();
	},
	delete_content: function (event){
		if(confirm("Are you sure you want to delete the selected files?")){
			console.log("Deleting Content");
		}
	},
	

	/*
	copy_content: function(event){
		var list = $('.content-container').find('input:checked + label').parent();
		var clipboard_list = [];
		for(var i = 0; i< list.length; i++)
			clipboard_list.push({data: $("#" + list[i].id).data("data"), 
								folder: $("#" + list[i].id + " .folder").length != 0});

		ClipboardViews.addItems(clipboard_list);
	},
	*/
	
});

/* Open directory view */
var ContainerView = BaseViews.BaseListView.extend({
	item_view: "node",
	template: require("./hbtemplates/content_container.handlebars"),
	initialize: function(options) {
		_.bindAll(this, 'add_content');	
		this.edit = options.edit; //TO USE FOR LATER
		this.topic = options.topic;
		this.index = options.index;
		this.edit_mode = options.edit_mode;
		this.containing_list_view = options.containing_list_view;
		this.collection = new Models.NodeCollection();
		this.collection = options.collection.get_all_fetch(options.topic.attributes.children);
		//this.listenTo(this.collection, "change", this.render);
		//console.log("container " + this.topic.attributes.title + " children:", this.collection);

		this.render();
		/* Set up animate sliding in from left */
		this.$el.css('margin-left', -this.$el.find(".container-interior").outerWidth());
		this.$el.css('z-index', "-100000px");
		/* Animate sliding in from left */
		this.$el.animate({'margin-left' : "0px"}, 500);
		//this.$el.css('z-index', 0);
	},
	render: function() {
		this.$el.html(this.template({
			topic: this.topic, 
			edit_mode: this.edit_mode, 
			index: this.index,
			content_list: this.collection.toJSON(),
		}));
		this.load_content();
		/* TODO: Dragging and Dropping */
		//this.$el.data("container", this);
		//handleDrop(this);
	},

	events: {
		'click .add_content_button':'add_content',

	},

	load_content : function(){
		var containing_list_view = this;
		var edit_mode = this.edit_mode;
		var el = containing_list_view.$el.find(".content-list");

		this.collection.forEach(function(entry){
			el.append("<li id='"+ entry.cid +"'></li>");
			var file_view = new ContentView({
				el: el.find("#" + entry.cid),
				model: entry, 
				edit_mode: edit_mode,
				containing_list_view:containing_list_view,
				allow_edit: false
			});
			containing_list_view.views.push(file_view);
		});
	},

	add_content: function(event){
		$("#main-content-area").append("<div id='dialog'></div>");
		var new_collection = new Models.NodeCollection();
		var add_view = new UploaderViews.AddContentView({
			el : $("#dialog"),
			collection: new_collection,
			containing_list_view: this,
			root: this.topic
		});
		//$("#dialog").dialog();
		//this.content.create();
		//this.render(false);
	},

	add_container:function(topic){
		this.containing_list_view.add_container(this.index, topic);
	},

	close_folders:function(){
		this.$el.find(".folder").css({
			"width": "302px",
			"background-color": "white",
			"border" : "none"
		});
		this.$el.find(".folder .glyphicon").css("display", "inline-block");
	},

	append_list: function(transfer){
		console.log("data", transfer.data);
		/*
		this.$el.append("<li id='"+ transfer.data.cid +"'></li>");
		var file_view = new ContentView({
			el: el.find("#" + entry.cid),
			model: entry, 
			edit_mode: edit_mode,
			containing_list_view:containing_list_view
		});


		if(transfer.is_folder){
			var folder_view = new FolderView(transfer.data);
			this.$el.find("ul").append(folder_view.el);
			this.content.push(folder_view);
		}else{
			var file_view = new FileView(transfer.data);
			this.$el.find("ul").append(file_view.el);
			this.content.push(file_view);
		}
		*/
	}
});


/*folders, files, exercises listed*/
var ContentView = BaseViews.BaseListItemView.extend({
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
		this.containing_list_view.set_editing(this.allow_edit);
		/* TODO: Dragging and Dropping */
		//if(this.edit_mode) handleDrag(this);
		//this.$el.data("content", this);
	/*
		this.$el.find("h3").html(this.trimText(this.$el.find("h3").html(), 22, null));
		this.$el.find("p").html(this.trimText(this.$el.find("p").html(), 100, this.$(".filler")));
		
		this.$el.attr("id", this.cid);
	*/
	},

	events: {
		'click .edit_folder_button': 'edit_folder',
		'click .open_folder':'open_folder',
		'dblclick label' : "open_folder",
		'click .filler' : 'expand_or_collapse_folder',
		'click .cancel_edit' : 'cancel_edit',
		'click .submit_edit' : 'submit_edit',
		'click .preview_button': 'preview_node'
	},

	expand_or_collapse_folder: function(event){
		/*
		event.preventDefault();
		event.stopPropagation();
		if(this.$(".filler").parent("label").hasClass("collapsed")){
			this.$(".filler").parent("label").removeClass("collapsed").addClass("expanded");
			this.$(".description").text(this.$(".filler").attr("title"));
			this.$(".filler").text("See Less");
		}
		else {
			this.$(".filler").parent("label").removeClass("expanded").addClass("collapsed");
			this.$('.char_counter').text(this.$(".description").html(), 100, this.$(".filler"));
			this.$(".filler").text("See More");
		}
		*/
	},
	open_folder:function(event){
		event.preventDefault();
		this.containing_list_view.close_folders();
		this.$el.find(".folder").animate({'width' : "345px"}, 500);
		this.$el.find(".folder").css({
			'background-color': (this.edit_mode)? "#CCCCCC" : "#87A3C6",
			'border' : "4px solid white",
			'border-right' : 'none'
		});
		this.$el.find(".folder .glyphicon").css("display", "none");
		this.containing_list_view.add_container(this.model);
	},
	edit_folder: function(event){
		this.allow_edit = true;
		//this.containing_list_view.set_editing(this.allow_edit);
		this.render();
		/*
		event.preventDefault();
		$("#clipboard-area").append("<div id=\"clipboard-edit-folder-area\"></div>");
		var view = new ClipboardViews.ClipboardEditFolderView({
			el: $("#clipboard-edit-folder-area"),
			edit: true,
			folder: this
		});
		this.set_as_placeholder(true);
		$("#clipboard").slideDown();
		*/
	},
	submit_edit: function(event){
		var title = ($("#textbox_" + this.model.id).val().trim() == "")? "Untitled" : $("#textbox_" + this.model.id).val().trim();
		var description = ($("#textarea_" + this.model.id).val().trim() == "")? " " : $("#textarea_" + this.model.id).val().trim();
		this.save({title:title, description:description});

		this.allow_edit = false;
		
		this.render();
	},
	cancel_edit: function(event){
		this.allow_edit = false;
		this.render();
	},
	preview_node: function(event){
		event.preventDefault();
		var view = new PreviewerViews.PreviewerView({
			el: $("#previewer-area"),
			model: this.file,
			file: this
		});
	}
}); 

/* handleDrag: adds dragging ability to a certain item
*	Parameters:
*		itemid: item to add dragging ability to
*	TODO:
* 		Handle when multiple items are checked to be moved
*/
function handleDrag(el){
	el.$el.attr('draggable', 'true');
	el.$el.on("dragstart", function(e){
		e.originalEvent.dataTransfer.setData("data", JSON.stringify({
			id: $(this).attr("id"), 
			data : $(this).wrap('<div/>').parent().html(),
			edit : true,
		}));

		e.originalEvent.dataTransfer.effectAllowed = "move";
		e.target.style.opacity = '0.4';
	});
	el.$el.on("dragend", function(e){
		e.target.style.opacity = '1';
	});
}

/* handleDrag: adds dropping ability to a certain container
*	Parameters:
*		containerid: container to add dropping ability to
*/
function handleDrop(container){
	container.$el.on('dragover', function(e){
		if (e.preventDefault) e.preventDefault();
		e.originalEvent.dataTransfer.dropEffect = 'move';
		return false;
	});
	container.$el.on('dragenter', function(e){
		return false;
	});

	container.$el.on('drop', function(e, container){
		if (e.stopPropagation) e.stopPropagation();
		var transfer = JSON.parse(e.originalEvent.dataTransfer.getData("data"));
		var data = $("#" + transfer.id).data("content");
		//$("#" + transfer.id).parent().remove();
		$(this).data("container").append_list({
			data : data, 
			is_folder: transfer.is_folder
		});
	});
}

module.exports = {
	TreeEditView: TreeEditView
}