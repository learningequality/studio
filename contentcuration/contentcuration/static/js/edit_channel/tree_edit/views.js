var Backbone = require("backbone");
var _ = require("underscore");
require("content-container.less");
var BaseViews = require("./../views");
var ClipboardViews = require("edit_channel/clipboard/views");
var PreviewerViews = require("edit_channel/previewer/views");
var Models = require("./../models");


var TreeEditView = BaseViews.BaseView.extend({
	container_index: 0,
	containers:[],
	template: require("./../hbtemplates/container_area.handlebars"),
	root: null,
	initialize: function(options) {
		_.bindAll(this, /*'copy_content','delete_content' ,*/ 'add_container', 'render_edit_mode');
		this.root = options.root;
		this.is_edit_page = options.edit;

		/*
		console.log(this.channel);
				this.isEditing = false;
		*/
		this.render();
	},
	render: function() {
		topic_list = [];
		topic_list.push(this.root);
		this.$el.html(this.template({edit: this.is_edit_page, topic_list: topic_list}));
		this.add_container(this.root);
	},
	add_container: function(topic){
		$("#container_area").append("<li id=" + this.containers.length+ " class='container content-container pull-left'></li>");
		var container_view = new ContainerView({
			el : "#container_area #" + this.containers.length,
			topic: topic, 
			edit: this.allow_edit, 
			index: this.containers.length,
			mode: this.is_edit_page
		});
		this.containers.push(container_view);
		this.render_edit_mode();
	},

	render_edit_mode: function(){
		$(".edit_folder_button").css('visibility', (this.isEditing) ? 'hidden' : 'visible');
		$(".edit_file_button").css('visibility',(this.isEditing) ? 'hidden' : 'visible');
		$(".content_options button").prop('disabled',this.isEditing);
	},

	/*
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
			/*
		}
	},
	
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

var ContainerView = BaseViews.BaseListView.extend({
	content: [],
	item_view: "NodeView",
	template: require("./../hbtemplates/content_container.handlebars"),
	initialize: function(options) {
		_.bindAll(this, 'add_content');	
		this.edit = options.edit;
		this.topic = options.topic;
		this.index = options.index;
		this.mode = options.mode;
		this.content = new Models.NodeCollection(options.topic.attributes.children);
		console.log("container " + this.topic.attributes.title + " children:", this.content);
		this.render(true);
	},
	render: function(animate) {
		this.$el.html(this.template({
			topic: this.topic.attributes, 
			mode: this.mode, 
			content_list: this.content.toJSON(),
		}));
		/* Set up animate sliding in from left */
		if(animate){
			
			this.$el.css('margin-left', -this.$el.find(".container-interior").outerWidth());
			this.$el.css('z-index', -100000);
		}

		this.load_content(this.$el.find(".content-list"), this.mode);

		/* Animate sliding in from left */
		if(animate){
			this.$el.animate({'margin-left' : "0px"}, 500);
			this.$el.css('z-index', 0);
		}
		//this.$el.data("container", this);
		//handleDrop(this);
	},
	events: {
		'click .add_content_button':'add_content'
	},

	load_content : function(el, edit){
		this.content.forEach(function (entry){
			var file_view = new ContentView({
				el: ".content-list #" + entry.id,
				file: entry.attributes, 
				mode: mode, 
				root: this.topic,
				isfolder : entry.attributes.kind == "Topic"
			});
			el.append(file_view.el);
		});
	},
	add_content: function(event){
		

/*
		var file_view = new FileView({
			content: window.channel_router.generate_file({
				title: "New Content Item", 
				root: this.topic
			}), 
			edit: this.edit, 
			root: this.topic, 
			container : this.topic.id
		});
*/
		//this.content.create();
		//this.render(false);
	},

});

var ContentView = BaseViews.BaseListItemView.extend({
	template: require("./../hbtemplates/content_folder.handlebars"),
}); 

module.exports = {
	TreeEditView: TreeEditView
}
	






/*
	initialize: function(options) {
		
	 	/* Set starting point of container to animate */
		//this.$el.css({'margin-left': - this.$el.outerWidth(), 'z-index': 1000 - container_count});
		/* Increase size of container area to accomodate for size of new container */
		//$("#container_area").css('width', $("#container_area").innerWidth() + this.$el.outerWidth());

		//this.$el.animate({ marginLeft: parseInt(this.$el.css('marginLeft'),10) == 0 ? this.$el.outerWidth() : 0});
		//this.$el.find("canvas").css('margin-top', (- this.$el.find(".title-bar").height() + 22) + "px");
		//this.$el.find(".container-interior").css('margin-top', (- this.$el.find(".title-bar").height() + 22) + "px");
		//this.$el.find(".content-list").height((this.$el.find("canvas").height() - this.$el.find(".title-bar").height() + 6) + "px");
	/*},
	
	add_content: function(event){
		event.preventDefault();
		var file_view = new FileView({
			file: window.channel_router.generate_file({
				title: "New Content Item", 
				root: this.topic
			}), 
			edit: this.edit, 
			root: this.topic, 
			container : this.topic.id
		});

		this.$el.find("ul .content_options").after(file_view.el);
		$("#clipboard-area").append("<div id=\"clipboard-placeholder\"></div>");
		window.add_content_view = new ClipboardViews.ClipboardAddContentView({
			el: $("#clipboard-placeholder"),
			file: file_view
		});
		$("#clipboard").slideDown();
		file_view.set_as_placeholder(true);
	},
	
	add_folder: function(event){
		event.preventDefault();
		var folder_view = new FolderView({
			topic: window.channel_router.generate_folder({
				title: "New Folder", 
				root: this.topic
				isfolder: kind == "Topic"
			}), 
			edit: this.edit, 
			root: this.topic
		});

		this.$el.find("ul .content_options").after(folder_view.el);
		this.content.push(folder_view);
		$("#clipboard-area").append("<div id=\"clipboard-edit-folder-area\"></div>");
		var view = new ClipboardViews.ClipboardEditFolderView({
			el: $("#clipboard-edit-folder-area"),
			edit: false,
			folder: folder_view
		});
		
		$("#clipboard").slideDown();
		folder_view.set_as_placeholder(true);
	},
	
	load_topics: function(topic, el, edit, container){
		
		window.topic_nodes.forEach(function (entry){
			if(entry.attributes.parent == index){
				var folder_view = new FolderView({
					topic: entry.attributes, 
					edit: edit, 
					container: container.cid
				});

				el.find("ul").append(folder_view.el);
			}
		});
		
	}, 
	
	append_list: function(transfer){
		if(transfer.is_folder){
			var folder_view = new FolderView(transfer.data);
			this.$el.find("ul").append(folder_view.el);
			this.content.push(folder_view);
		}else{
			var file_view = new FileView(transfer.data);
			this.$el.find("ul").append(file_view.el);
			this.content.push(file_view);
		}
	}


var FolderView = BaseViews.BaseListItemView.extend({
	
	initialize: function(options) {
		_.bindAll(this, 'edit_folder','open_folder','expand_or_collapse_folder', 
						'set_as_placeholder' , 'delete_view','update','delete_model','get_data');
		//this.listenTo(this.model, "change:newtopicnodes or contentnodes", this.render);
		this.edit = options.edit;
		this.root = options.root;
		this.topic = options.topic;
		this.render();
	},
	render: function() {
		this.$el.html(this.template({
			folder: this.topic.attributes, 
			edit: this.edit, 
			cid: this.cid
		}));

		this.$el.find("h3").html(this.trimText(this.$el.find("h3").html(), 22, null));
		this.$el.find("p").html(this.trimText(this.$el.find("p").html(), 100, this.$(".filler")));
		if(this.edit) handleDrag(this);
		this.$el.data("content", this);
		this.$el.attr("id", this.cid);
	},
	
	events: {
		'click .edit_folder_button': 'edit_folder',
		'click .open_folder':'open_folder',
		'click .filler' : 'expand_or_collapse_folder',
	},
	set_as_placeholder: function(isPlaceholder){
		if(isPlaceholder){
			this.$el.attr("class","newcontent");
			this.$el.attr('draggable', 'false');
			window.edit_page_view.set_editing(true);
		}
		else{
			this.$el.attr("class","content");
			this.$el.attr('draggable', 'true');
			window.edit_page_view.set_editing(false);
		}
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
			this.$('.char_counter').text(this.$(".description").html(), 100, this.$(".filler"));
			this.$(".filler").text("See More");
		}
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
		this.set_as_placeholder(false);
		this.topic.set(folder);
		window.channel_router.save_folder(this.root, this.topic);
		this.render();
	},
	delete_model: function(){
		
	},
	get_data: function(){
		return this.topic;
	}
});

var FileView = BaseViews.BaseListItemView.extend({
	template: require("./../hbtemplates/content_file.handlebars"),
	initialize: function(options) {
		_.bindAll(this, 'preview_node', 'edit_file', 'set_as_placeholder', 'delete_view', 'update');
		this.root = options.root;
		this.edit = options.edit;
		this.file = options.file;
		this.render();
	},
	render: function() {
		this.$el.html(this.template({
			file: this.file.attributes, 
			edit: this.edit, 
			cid: this.cid
		}));

		this.$el.find("h4").html(this.trimText(this.$el.find("h4").text(), "...", 25, false));
		
		this.$el.attr("id", this.cid);
		this.$el.data("content", this);
		if(this.edit) handleDrag(this);
	},
	
	events: {
		'click .edit_file_button': 'edit_file',
		'click .preview_button': 'preview_node'
	},
	
	edit_file: function(event){
		event.preventDefault();
		$("#clipboard-area").append("<div id=\"clipboard-placeholder\"></div>");
		new ClipboardViews.ClipboardEditFileView({
			el: $("#clipboard-placeholder"),
			//model: $("#"+ DOMHelper.getParentOfTag(event.target, "li").id).data("data"),
			file: this
		});
		this.set_as_placeholder(true);
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
		if(isPlaceholder){
			this.$el.attr("class","newcontent");
			this.$el.attr('draggable', 'false');
			window.edit_page_view.set_editing(true);
			console.log("REACHED HERE");
		}
		else {
			this.$el.attr("class","content");
			this.$el.attr('draggable', 'true');
			window.edit_page_view.set_editing(false);
		}
	},
	update: function(file){
		this.set_as_placeholder(false);
		this.file.set(file);
		window.channel_router.save_file(this.root, this.file);
		this.render();
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
/*
function handleDrag(el){
	el.$el.attr('draggable', 'true');
	el.$el.on("dragstart", function(e){
		e.originalEvent.dataTransfer.setData("data", JSON.stringify({
			id: $(this).attr("id"), 
			data : $(this).wrap('<div/>').parent().html(),
			edit : true,
			is_folder : $(this).find("label").hasClass("folder")
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
/*
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
		$("#" + transfer.id).parent().remove();
		$(this).data("container").append_list({
			data : data, 
			is_folder: transfer.is_folder
		});
	});
}
*/

