var Backbone = require("backbone");
var _ = require("underscore");
require("edit.less");

var LoadHelper = require("edit_channel/utils/LoadHelper");
var DOMHelper = require("edit_channel/utils/DOMHelper");
var TextHelper = require("edit_channel/utils/TextHelper");
var LessHelper = require("edit_channel/utils/LessHelper");
var ClipboardViews = require("edit_channel/clipboard/views");
var PreviewerViews = require("edit_channel/previewer/views");

var container_number; //Used to create unique identifier for directories

var TreeEditView = Backbone.View.extend({
	template: require("./../hbtemplates/container_area.handlebars"),
	initialize: function(options) {
		_.bindAll(this, 'edit_folder', 'preview_node', 'add_content','edit_file','add_folder',
					'copy_content','delete_content','open_folder','expand_folder','minimize_folder');
		//this.listenTo(this.model, "change:newtopicnodes or contentnodes", this.render);
		this.edit = options.edit;
		this.render();
	},
	render: function() {
		this.$el.html(this.template({edit: this.edit}));
		container_number = 0;
		container_number = LoadHelper.loadContainer(null,this.model.topic.get("root_node"), this.model.topicnodes,
												this.model.contentnodes,container_number,this.edit, true, 0);
	},
	
	events: {
		'click .edit_folder_button': 'edit_folder',
		'click .edit_file_button': 'edit_file',
		'click .preview_button': 'preview_node',
		'click .add_content_button':'add_content',
		'click .add_folder_button':'add_folder',
		'click .copy' : 'copy_content',
		'click .delete' : 'delete_content',
		'click .open_folder':'open_folder',
		'click .filler' : 'expand_folder',
		'click .minimize' : 'minimize_folder'
	},
	expand_folder: function(event){
		TextHelper.manageFolder(event, true);
	},
	minimize_folder: function(event){
		TextHelper.manageFolder(event, false);
	},
	open_folder:function(event){
		event.preventDefault();
		var el = DOMHelper.getParentOfTag(event.target, "label");
		container_number = LoadHelper.loadContainer(el,$("#"+el.parentNode.id).data("data"),this.model.topicnodes,
												this.model.contentnodes,container_number,this.edit, false, "#CCCCCC");
		if($("#is_editing").val() == "y"){
			$(".edit_folder_button").css('visibility','hidden');
			$(".edit_file_button").css('visibility','hidden');
			$(".content_options button").prop('disabled',true);
		}
	},
	edit_folder: function(event){
		event.preventDefault();
		openClipboard();
		var view = new ClipboardViews.ClipboardEditFolderView({
			el: $("#clipboard-area"),
			model: $("#"+ DOMHelper.getParentOfTag(event.target, "li").id).data("data"),
			edit: true
		});
		$("#clipboard").slideDown();
	},
	
	edit_file: function(event){
		event.preventDefault();
		openClipboard();
		new ClipboardViews.ClipboardEditFileView({
			el: $("#clipboard-area"),
			model: $("#"+ DOMHelper.getParentOfTag(event.target, "li").id).data("data")
		});
		$("#clipboard").slideDown();
	},
	
	preview_node: function(event){
		event.preventDefault();
		var file = $("#"+ DOMHelper.getParentOfTag(event.target, "li").id);
		var view = new PreviewerViews.PreviewerView({
			el: $("#previewer-area"),
			model:  file.data("data").attributes,
			file: file
		});
	},
	
	add_content: function(event){
		event.preventDefault();
		var file_template = require("./../hbtemplates/content_file.handlebars");
		newContent(file_template, event.target);
		new ClipboardViews.ClipboardAddContentView({
			el: $("#clipboard-area"),
			//model: this.model //INSERT ROOT NODE TO ADD TO RIGHT TREE
		});
		
		$("#clipboard").slideDown();
	},
	
	add_folder: function(event){
		event.preventDefault();
		var folder_template = require("./../hbtemplates/content_folder.handlebars");
		newContent(folder_template, event.target);
		var view = new ClipboardViews.ClipboardEditFolderView({
			el: $("#clipboard-area"),
			//model: event.target.parentnode... //include topic tree root to know which tree to add to
			edit: false
		});
		$("#clipboard").slideDown();
	},
	
	delete_content: function (event){
		if(confirm("Are you sure you want to delete the selected files?")){
			console.log("Deleting Content");
			var selected = $('#edit').find('input:checked + label');
			for(var i = 0; i < selected.length; i++){
				console.log($("#"+selected[i].parentNode.id).data("data").attributes);
				selected[i].parentNode.remove();
			}
		}
	},
	
	copy_content: function(event){
		var list = $('.content-container').find('input:checked + label').parent();
		var clipboard_list = [];
		for(var i = 0; i< list.length; i++)
			clipboard_list.push({data: $("#" + list[i].id).data("data"), folder: $("#" + list[i].id + " .folder").length != 0});
		ClipboardViews.addItems(clipboard_list);
	}
});

function newContent(template, content){
	openClipboard();
	//LessHelper.loadLessVariablesFor("#" + content.id + " label");
	var containerid = "#" + DOMHelper.getParentOfClass(content, "content-container").id;
	var index = containerid.match(/\d+/)[0];
	$(containerid + " .content_options").after(template({index: index , list_index: "new", edit: edit}));
	$("#item_" + index + "_new label").css("background-color", "#89C0B1");
	$("#item_" + index + "_new").attr("class","newcontent");
	$("#item_" + index + "_new div").css("display","none");
	$("#item_" + index + "_new input").css("visibility","hidden");
	
}

function openClipboard(){
	$("#is_editing").val("y");
	$(".content_options button").prop('disabled',true);
	$(".edit_folder_button").css('visibility','hidden');
	$(".edit_file_button").css('visibility','hidden');
}

module.exports = {
	TreeEditView: TreeEditView
}