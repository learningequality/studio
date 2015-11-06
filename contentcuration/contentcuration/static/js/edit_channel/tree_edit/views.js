var Backbone = require("backbone");
var _ = require("underscore");
require("content-container.less");
var DOMHelper = require("edit_channel/utils/DOMHelper");
var TextHelper = require("edit_channel/utils/TextHelper");
var ContainerHelper = require("edit_channel/utils/ContainerHelper");

var LessHelper = require("edit_channel/utils/LessHelper");
var ClipboardViews = require("edit_channel/clipboard/views");
var PreviewerViews = require("edit_channel/previewer/views");
var container_count;
var containers = [];
var isEditing;
window.TreeEditView = Backbone.View.extend({
	template: require("./../hbtemplates/container_area.handlebars"),
	initialize: function(options) {
		_.bindAll(this, 'copy_content','delete_content' , 'set_editing', 'add_container');
		//this.listenTo(this.model, "change:newtopicnodes or contentnodes", this.render);
		this.edit = options.edit;
		this.root = options.channel.root_node;
		if(!this.root)
			this.root = window.channel_router.generate_folder({title: "[Untitled]"});
		isEditing = false;
		container_count = 1;
		this.render();
	},
	render: function() {
		this.$el.html(this.template({edit: this.edit}));
		this.add_container(this.root.attributes);
	},
	
	events: {
		'click .copy' : 'copy_content',
		'click .delete' : 'delete_content',
	},	
	delete_content: function (event){
		if(confirm("Are you sure you want to delete the selected files?")){
			console.log("Deleting Content");
			/*
			var selected = $('#edit').find('input:checked + label');
			for(var i = 0; i < selected.length; i++){
				console.log($("#"+selected[i].parentNode.id).data("data").attributes);
				selected[i].parentNode.remove();
			}
			*/
		}
	},
	
	copy_content: function(event){
		var list = $('.content-container').find('input:checked + label').parent();
		var clipboard_list = [];
		for(var i = 0; i< list.length; i++)
			clipboard_list.push({data: $("#" + list[i].id).data("data"), folder: $("#" + list[i].id + " .folder").length != 0});
		ClipboardViews.addItems(clipboard_list);
	},
	
	set_editing: function (editing){
		isEditing = editing;
		if(editing){
			$(".edit_folder_button").css('visibility','hidden');
			$(".edit_file_button").css('visibility','hidden');
			$(".content_options button").prop('disabled',true);
		} else{
			$(".edit_folder_button").css('visibility','visible');
			$(".edit_file_button").css('visibility','visible');
			$(".content_options button").prop('disabled',false);
		}
	},
	
	add_container: function(topic){
		var container_view = new ContainerView({topic: topic, edit: this.edit, model: this.model});
		$("#container_area").append(container_view.el);
		containers.push(container_view);
	}
});

window.ContainerView = Backbone.View.extend({
	template: require("./../hbtemplates/content_container.handlebars"),
	initialize: function(options) {
		_.bindAll(this, 'add_content','add_folder', 'load_topics', 'load_content','insert_folder','insert_content');
		this.edit = options.edit;
		this.topic = options.topic;
		this.model = options.model;

		this.render();		
		/* Set starting point of container to animate */
		this.$el.css({'margin-left': - this.$el.outerWidth(), 'z-index': 1000 - container_count});
		/* Increase size of container area to accomodate for size of new container */
		$("#container_area").css('width', $("#container_area").innerWidth() + this.$el.outerWidth());
		
		
		this.$el.animate({ marginLeft: parseInt(this.$el.css('marginLeft'),10) == 0 ? this.$el.outerWidth() : 0});
	//	this.$el.find("canvas").css('margin-top', (- this.$el.find(".title-bar").height() + 22) + "px");
		//this.$el.find(".container-interior").css('margin-top', (- this.$el.find(".title-bar").height() + 22) + "px");
		//this.$el.find(".content-list").height((this.$el.find("canvas").height() - this.$el.find(".title-bar").height() + 6) + "px");
	},
	render: function() {
		this.$el.html(this.template({title: this.topic.title, topic: this.topic, edit: this.edit}));
		this.load_topics(this.topic, this.$el, this.edit, this);
		this.load_content(this.topic, this.$el, this.edit, this);
	},
	
	events: {
		'click .add_content_button':'add_content',
		'click .add_folder_button':'add_folder'
	},
	add_content: function(event){
		event.preventDefault();
		var file_view = new FileView({file: window.channel_router.generate_file({title: "New Content Item"}), edit: this.edit, container: this});
		file_view.set_as_placeholder(true);
		this.$el.find("ul").append(file_view.el);
		new ClipboardViews.ClipboardAddContentView({
			el: $("#clipboard-area"),
			model: this.file
		});
		$("#clipboard").slideDown();
		window.edit_page_view.set_editing(true);
	},
	
	add_folder: function(event){
		event.preventDefault();
		var folder_view = new FolderView({topic: window.channel_router.generate_folder({title: "New Folder"}), edit: this.edit, container: this});
		folder_view.set_as_placeholder(true);
		this.$el.find("ul").append(folder_view.el);
		var view = new ClipboardViews.ClipboardEditFolderView({
			el: $("#clipboard-area"),
			model: this.topic,
			edit: false,
			folder: folder_view
		});
		
		$("#clipboard").slideDown();
		window.edit_page_view.set_editing(true);
	},
	
	load_topics: function(topic, el, edit, container){
		var index = 0;
		console.log(topic);
		//this.model.topics.at(topic);
		/*
		this.model.topics.forEach(function(entry){
			if(JSON.stringify(entry.attributes) == JSON.stringify(topic))
				return index;
			index++;
		});
		
		this.model.topics.forEach(function (entry){
			if(entry.attributes.parent == index){
				var folder_view = new FolderView({topic: entry.attributes, edit: edit, container: container});
				el.find("ul").append(folder_view.el);
			}
		});
		*/
	}, 
	load_content : function(el, edit){
		this.model.content.forEach(function (entry){
			if(entry.attributes.parent == this.topic){
				var file_view = new FileView({file: entry.attributes, edit: edit, container: container});
				el.find("ul").append(file_view.el);
			}
		});
	},
	insert_folder: function(folder){
	
	//SAVE HERE
		window.channel_router.generate_folder(folder);
		this.render();
	},
	insert_content: function(content){
	
	//SAVE HERE
		window.channel_router.generate_file(content);
		this.render();
	}
});

window.FolderView = Backbone.View.extend({
	template: require("./../hbtemplates/content_folder.handlebars"),
	initialize: function(options) {
		_.bindAll(this, 'edit_folder','open_folder','expand_folder','minimize_folder', 'set_as_placeholder' , 'delete_view','update');
		//this.listenTo(this.model, "change:newtopicnodes or contentnodes", this.render);
		this.edit = options.edit;
		this.container = options.container;
		this.topic = options.topic;
		this.render();
	},
	render: function() {
		this.$el.html(this.template({folder: this.topic, edit: this.edit}));
		this.$el.find("h3").html(TextHelper.trimText(this.$el.find("h3").html(), "...", 22, false));
		this.$el.find("p").html(TextHelper.trimText(this.$el.find("p").html(), "... read more", 120, true));
		if(this.edit) handleDrag(this.$el);
	},
	
	events: {
		'click .edit_folder_button': 'edit_folder',
		'click .open_folder':'open_folder',
		'click .filler' : 'expand_folder',
		'click .minimize' : 'minimize_folder'
	},
	set_as_placeholder: function(isPlaceholder){
		if(isPlaceholder){
			this.$el.attr("class","newcontent");
			this.$el.prop('draggable', 'false');
			window.edit_page_view.set_editing(true);
		}
		else{
			this.$el.attr("class","content");
			this.$el.prop('draggable', 'true');
			window.edit_page_view.set_editing(false);
		}
	},
	expand_folder: function(event){
		TextHelper.manageFolder(event, true);
	},
	minimize_folder: function(event){
		TextHelper.manageFolder(event, false);
	},
	open_folder:function(event){
		event.preventDefault();
		window.edit_page_view.add_container(this.topic);
	},
	edit_folder: function(event){
		event.preventDefault();
		$("#clipboard-area").append("<div id=\"clipboard-edit-folder-area\"></div>");
		var view = new ClipboardViews.ClipboardEditFolderView({
			el: $("#clipboard-edit-folder-area"),
			model: this.topic,
			edit: true,
			folder: this
		});
		this.set_as_placeholder(true);
		$("#clipboard").slideDown();
	},
	delete_view: function(){
		this.undelegateEvents();
		this.unbind();		
		this.remove();
	},
	update: function(folder){
		this.topic.title = folder.title;
		this.topic.description = folder.description;
		//SWITCH TO BELOW ONCE CONNECTS TO DB
		//this.topic.set('description', folder.description);
		//this.topic.set('description', folder.description);
		this.set_as_placeholder(false);
		
		this.render();
	}
});

window.FileView = Backbone.View.extend({
	template: require("./../hbtemplates/content_file.handlebars"),
	initialize: function(options) {
		_.bindAll(this, 'preview_node', 'edit_file', 'set_as_placeholder');
		//this.listenTo(this.model, "change:newtopicnodes or contentnodes", this.render);
		this.edit = options.edit;
		this.container = options.container;
		this.file = options.file;
		this.render();
	},
	render: function() {
		this.$el.html(this.template({file: this.file, edit: this.edit}));
		this.$el.find("h4").html(TextHelper.trimText(el.find("h4").text(), "...", 25, false));
		if(this.edit) handleDrag(this.$el);
	},
	
	events: {
		'click .edit_file_button': 'edit_file',
		'click .preview_button': 'preview_node'
	},
	
	edit_file: function(event){
		event.preventDefault();
		new ClipboardViews.ClipboardEditFileView({
			el: $("#clipboard-area"),
			model: $("#"+ DOMHelper.getParentOfTag(event.target, "li").id).data("data")
		});
		$("#clipboard").slideDown();
	},
	
	preview_node: function(event){
		event.preventDefault();
		var view = new PreviewerViews.PreviewerView({
			el: $("#previewer-area"),
			model: this.file,
			file: this
		});
		
	},
	set_as_placeholder: function(isPlaceholder){
		if(isPlaceholder)
			this.$el.attr("class","newcontent");
		else this.$el.attr("class","content");
	},
	delete_view: function(){
		this.undelegateEvents();
		this.unbind();		
		this.remove();
	}
});

/* handleDrag: adds dragging ability to a certain item
*	Parameters:
*		itemid: item to add dragging ability to
*	TODO:
* 		Handle when multiple items are checked to be moved
*/
function handleDrag(el){
	el.on("dragstart", function(e){
		e.originalEvent.dataTransfer.setData("data", JSON.stringify({ "data" : $("#"+e.originalEvent.target.id).data("data"), 
											"is_folder" : $("#"+e.originalEvent.target.id + " label").hasClass("folder"),
											"original_id" : "#" + e.originalEvent.target.id, edit : true}));
		e.originalEvent.dataTransfer.effectAllowed = "copyMove";
		e.target.style.opacity = '0.4';
	});
	el.on("dragend", function(e){
		e.target.style.opacity = '1';
	});
}

/* handleDrag: adds dropping ability to a certain container
*	Parameters:
*		containerid: container to add dropping ability to
*/
function handleDrop(containerid){
	$(containerid).on('dragover', function(e){
		if (e.preventDefault) e.preventDefault();
		e.originalEvent.dataTransfer.dropEffect = 'move';
		return false;
	});
	$(containerid).on('dragenter', function(e){
		return false;
	});

	$(containerid).on('drop', function(e){
		if (e.stopPropagation) e.stopPropagation();
		var transfer = JSON.parse(e.originalEvent.dataTransfer.getData("data"));
		var list_index = parseInt($("#" + this.id + " li:last-child").attr("id").split("_")[2]) + 1;
		var template = (transfer.is_folder)? require("./../hbtemplates/content_folder.handlebars") : require("./../hbtemplates/content_file.handlebars");
		console.log(e.originalEvent);
		console.log(document.elementFromPoint(e.originalEvent.screenX, e.originalEvent.screenY));
		
		//document.elementFromPoint(x, y);
		var el = DOMHelper.getParentOfTag(e.target, "li");
		if(!el){
			appendList(transfer.data,template, "#" + this.id + " ul", this.id.split("_")[1], list_index);
		}
		else{
			
		}
		
		//console.log(el);
		/*
			$("#container_"+ container_number + " ul").append(folder_template({index: container_number, list_index: list_index, folder: entry.attributes, edit: edit}));
			var itemid = "#item_" + container_number + "_"+list_index;
			$(itemid).data("data",entry);
			if(edit) handleDrag(itemid);
			$(itemid + " h3").html(textHelper.trimText($(itemid + " h3").text(), "...", 22, false));
			$(itemid + " p").html(textHelper.trimText($(itemid + " p").text(), "... read more", 120, true));
			list_index ++;
		*/
		//appendList(transfer.data,template, "#" + this.id + " ul", this.id.split("_")[1], list_index);
		$(transfer.original_id).remove();
		//console.log(transfer.data);
		//console.log(transfer.is_folder);
		//console.log($("#" + this.id));
	});
}
module.exports = {
	TreeEditView: TreeEditView
}