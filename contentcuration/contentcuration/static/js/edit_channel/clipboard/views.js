var Backbone = require("backbone");
var _ = require("underscore");
require("clipboard.less");

var PreviewerViews = require("edit_channel/previewer/views");
var list_item_template = require("./hbtemplates/clipboard_list_item.handlebars");
var prevTemplate;
var list_index;

/* Loaded when user clicks edit icon on folder or "Add Folder" button */
var ClipboardEditFolderView = Backbone.View.extend({
	template: require("./hbtemplates/clipboard_edit_folder.handlebars"),
	initialize: function(options) {
		this.edit = options.edit;
            _.bindAll(this, 'update_folder', 'toggle_clipboard');
            //this.listenTo(this.model, "change:number_of_hexagons", this.render);
            this.render();
        },
        render: function() {
			this.$el.html(this.template({folder: ((this.edit)? this.model.attributes : null), edit: this.edit}));
			//instead of null, add topic tree to add to
        },
		
		events: {
			'click .clipboard_update_folder': 'update_folder',
			'click .toggle_clipboard':'toggle_clipboard'
		},

		update_folder: function(event){
			if($("#folder_name").val().trim() == "")
				$("#name_err").css("display", "inline");
			else{
				//RELOAD TREE 
				$("#clipboard").hide();
			}
		},
		toggle_clipboard: function(event){
			$("#clipboard").hide();
		}
});

/* Loaded when user clicks edit icon on file*/
var ClipboardEditFileView = Backbone.View.extend({
	template: require("./hbtemplates/clipboard_edit_file.handlebars"),
	initialize: function() {
		_.bindAll(this, 'toggle_clipboard', 'update_file');
		//this.listenTo(this.model, "change:number_of_hexagons", this.render);
		this.render();
	},
	render: function() {
		this.$el.html(this.template({file: this.model.attributes}));
	},
	
	events: {
		'click .toggle_clipboard':'toggle_clipboard',
		'click .clipboard_update_file':'update_file'
	},
	
	toggle_clipboard: function(event){
		$("#clipboard").hide();
	},
	update_file: function(event){
		if($("#content_name").val().trim() == "")
				$("#name_err").css("display", "inline");
		else{
			//RELOAD TREE 
			$("#clipboard").hide();
		}
	}
});

/* Loaded when user clicks "Add Content" button */
var ClipboardAddContentView = Backbone.View.extend({
	template: require("./hbtemplates/clipboard_header.handlebars"),
	initialize: function() {
		_.bindAll(this, 'toggle_clipboard','computer_choose_content', 'channel_choose_content', 'choose_file', 'back_to_1', 'to_step_3','previous','preview_file','open_folder', 'close_file', 'open_folder_path', 'add_folder_to_list','add_tag','toggle_folder', 'clipboard_finish','choose_channel','add_file_to_list');
		//this.listenTo(this.model, "change:number_of_hexagons", this.render);
		this.render();
	},
	render: function() {
		this.$el.html(this.template(this.model));
		var choose_template = require("./hbtemplates/clipboard_step_1.handlebars");
		$("#clipboard_content").append(choose_template(this.model));
	},
	
	events: {
		'click .toggle_clipboard':'toggle_clipboard',
		'click .computer_choose_content':'computer_choose_content',
		'click .channel_choose_content':'channel_choose_content',
		'click .clipboard_previous':'previous',
		'click .clipboard_2_previous':'back_to_1',
		'click .choose_file':'choose_file',
		'change select':'choose_channel',
		'click .file_plus':'add_file_to_list',
		'click .clipboard_next':'to_step_3',
		'click .close_file':'close_file',
		'click .preview_file': 'preview_file',
		'click .folder': 'open_folder',
		'click .folder_plus': 'add_folder_to_list',
		'click .folder_path': 'open_folder_path',
		'click .plus':'add_tag',
		'click .toggle_folder':'toggle_folder',
		'click .clipboard_finish':'clipboard_finish'
	},
	
	/* Functions shared across steps*/
	toggle_clipboard: function(event){
		$("#clipboard").hide();
	},
	open_folder: function(event){
		console.log("Opening folder...");
	},
	close_file: function(event){
		event.target.parentNode.remove();
	},
	preview_file: function(event){
		var previewHelper = require("edit_channel/utils/loadPreview");
		//previewHelper.loadPreview(event.target...[file]);
	},
	
	/* Step 1: choose content from computer or channel */
	computer_choose_content: function(event){
		prevTemplate = require("./hbtemplates/clipboard_step_2_computer.handlebars");
		$("#clipboard_content").empty();
		$("#clipboard_content").append(prevTemplate(this.model));			
	},
	channel_choose_content:  function(event){
		prevTemplate = require("./hbtemplates/clipboard_step_2_channel.handlebars");
		$("#clipboard_content").empty();
		$("#clipboard_content").append(prevTemplate(this.model));
	},
	
	/* Step 2: select files to be added */
	back_to_1: function(event){
		var add_template = require("./hbtemplates/clipboard_step_1.handlebars");
		$("#clipboard_content").empty();
		$("#clipboard_content").append(add_template(this.model));
	},
	add_folder_to_list: function(event){
		console.log("Adding folder to list...");
		var listHelper = require("edit_channel/utils/loadList");
		//list_index = listHelper.appendList(file, list_item_template, "#selected_content_area ul", list_index);
	},
	add_file_to_list: function(event){
		console.log("Adding file to list...");
		var listHelper = require("edit_channel/utils/loadList");
		//list_index = listHelper.appendList(file, list_item_template, "#selected_content_area ul", list_index);
	},
	choose_file: function(event){
		var input = $(document.createElement('input'));
		input.trigger('click'); // opening dialog
		var listHelper = require("edit_channel/utils/loadList");
		/*
		if file selected 
			list_index = listHelper.appendList(file, list_item_template, "#files_content_area ul", list_index);
		else list_index = listHelper.appendList(file, list_item_template, "#files_content_area ul", list_index);
		*/
	},
	choose_channel: function(event){
		var listHelper = require("edit_channel/utils/loadList");
		//listHelper.loadList(this.model.topicnodes, this.model.contentnodes, list_item_template, list_item_template, "#files_content_area ul");
	},
	to_step_3: function(event){
		var meta_template = require("./hbtemplates/clipboard_step_3.handlebars");
		$("#clipboard_content").empty();
		$("#clipboard_content").append(meta_template(this.model));
		var listHelper = require("edit_channel/utils/loadList");
		//listHelper.loadList(this.model.topicnodes, this.model.contentnodes, list_item_template, list_item_template, "#metalist ul");
	},

	/* Step 3: review metadata */
	previous: function(event){
		$("#clipboard_content").empty();
		$("#clipboard_content").append(prevTemplate(this.model));
	},
	open_folder_path: function(event){
		console.log("Opening folder path...");
	},
	add_tag: function(event){
		console.log("Adding tag...");
	},
	toggle_folder: function(event){
		console.log("Toggling folder...");
	},
	clipboard_finish: function(event){
		console.log("Finishing...");
		$("#clipboard").hide();
	}
});

/*Todo: export only one ClipboardView once views are an extension of it*/
module.exports = {
	ClipboardEditFolderView:ClipboardEditFolderView,
	ClipboardEditFileView:ClipboardEditFileView,
	ClipboardAddContentView:ClipboardAddContentView
}