var Backbone = require("backbone");
var _ = require("underscore");
require("edit.less");
var LoadHelper = require("edit_channel/utils/loadTree");
var ClipboardViews = require("edit_channel/clipboard/views");

var container_number; //Used to create unique identifier for directories

var TreeEditView = Backbone.View.extend({
	template: require("./../hbtemplates/container_area.handlebars"),
	initialize: function(options) {
            _.bindAll(this, 'edit_folder', 'preview_node', 'add_content','edit_file','add_folder',
						'copy_content','delete_content','open_folder');
            //this.listenTo(this.model, "change:newtopicnodes or contentnodes", this.render);
			this.edit = options.edit;
            this.render();
        },
	render: function() {
		this.$el.html(this.template({edit: this.edit}));
		container_number = 0;
		container_number = LoadHelper.loadTree(null,this.model.topic.get("root_node"), this.model.topicnodes,
												this.model.contentnodes,container_number,this.edit);
	},
	
	events: {
		'click .edit_folder_button': 'edit_folder',
		'click .edit_file_button': 'edit_file',
		'click .preview_button': 'preview_node',
		'click .add_content_button':'add_content',
		'click .add_folder_button':'add_folder',
		'click .copy' : 'copy_content',
		'click .delete' : 'delete_content',
		'click .open_folder':'open_folder'
	},
	
	open_folder:function(event){
		event.preventDefault();
		var el = event.target.parentNode.parentNode;
		var notSelected = $("#"+el.parentNode.parentNode.parentNode.parentNode.id).find('.folder');
		for(var i = 0; i < notSelected.length; i++)
			notSelected[i].style.backgroundColor="#EBECED";
		el.style.backgroundColor="#A9BCCD";
		container_number = LoadHelper.loadTree(el.parentNode,$("#"+el.parentNode.id).data("data"),this.model.topicnodes,
												this.model.contentnodes,container_number,this.edit);
		
	},
	
	edit_folder: function(event){
		event.preventDefault();
		var view = new ClipboardViews.ClipboardEditFolderView({
			el: $("#clipboard-area"),
			model: $("#"+event.target.parentNode.parentNode.parentNode.id).data("data"),
			edit: true
		});
		$("#clipboard").animate({
			marginRight: parseInt($("#clipboard").css('marginRight'),10) == 0 ? $("#clipboard").outerWidth() : 0
		});
	},
	
	edit_file: function(event){
		event.preventDefault();
		new ClipboardViews.ClipboardEditFileView({
			el: $("#clipboard-area"),
			model: $("#"+event.target.parentNode.parentNode.parentNode.id).data("data")
		});
		$("#clipboard").animate({
			marginRight: parseInt($("#clipboard").css('marginRight'),10) == 0 ? $("#clipboard").outerWidth() : 0
		});
	},
	
	preview_node: function(event){
		event.preventDefault();
		var previewHelper = require("edit_channel/utils/loadPreview");
		previewHelper.loadPreview($("#"+event.target.parentNode.parentNode.parentNode.id).data("data"));
	},
	
	add_content: function(event){
		event.preventDefault();
		new ClipboardViews.ClipboardAddContentView({
			el: $("#clipboard-area"),
			//model: this.model //INSERT ROOT NODE TO ADD TO RIGHT TREE
		});
		$("#clipboard").animate({
			marginRight: parseInt($("#clipboard").css('marginRight'),10) == 0 ? $("#clipboard").outerWidth() : 0
		});
	},
	
	add_folder: function(event){
		event.preventDefault();
		var view = new ClipboardViews.ClipboardEditFolderView({
			el: $("#clipboard-area"),
			//model: event.target.parentnode... //include topic tree root to know which tree to add to
			edit: false
		});
		$("#clipboard").animate({
			marginRight: parseInt($("#clipboard").css('marginRight'),10) == 0 ? $("#clipboard").outerWidth() : 0
		});
	},
	
	delete_content: function (event){
		if(confirm("Are you sure you want to delete the selected files?"))
		{
			console.log("Deleting Content");
			var selected = $('#container_area').find('input:checked + label');
			for(var i = 0; i < selected.length; i++)
				console.log($("#"+selected[i].parentNode.id).data("data").attributes);
		}
	},
	
	copy_content: function(event){
		var selected = $('#container_area').find('input:checked + label');
		console.log("Copying Content");
		for(var i = 0; i < selected.length; i++)
			console.log($("#"+selected[i].parentNode.id).data("data").attributes);
	}
});

module.exports = {
	TreeEditView: TreeEditView
}