var Backbone = require("backbone");
var _ = require("underscore");
require("edit.less");

var ClipboardViews = require("edit_channel/clipboard/views");

var container_number; //Used to create unique identifier for directories

var TreeEditView = Backbone.View.extend({
	template: require("./hbtemplates/edit.handlebars"),
	initialize: function() {
            _.bindAll(this, 'edit_folder', 'preview_node', 'add_content','edit_file','add_folder','copy_content','delete_content','open_folder');
            //this.listenTo(this.model, "change:newtopicnodes or contentnodes", this.render);
            this.render();
        },
	render: function() {
		this.$el.html(this.template(this.model));
		$("td:empty").remove();
		container_number = 0;
		$("#edit_container_area").wrapInner("<table cellspacing='30'><tr>");
		loadTree(null, this.model.topic.get("root_node"), this.model.topicnodes, this.model.contentnodes);
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
		
		loadTree(el.parentNode, $("#"+el.parentNode.id).data("data"),this.model.topicnodes, this.model.contentnodes)
	},
	
	edit_folder: function(event){
		event.preventDefault();
		var view = new ClipboardViews.ClipboardEditFolderView({
			el: $("#clipboard-area"),
			model: $("#"+event.target.parentNode.parentNode.parentNode.id).data("data")
		});
		$("#clipboard").animate({
		marginRight: parseInt($("#clipboard").css('marginRight'),10) == 0 ?
			$("#clipboard").outerWidth() : 0
		});
	},
	
	edit_file: function(event){
		event.preventDefault();
		new ClipboardViews.ClipboardEditFileView({
			el: $("#clipboard-area"),
			model: $("#"+event.target.parentNode.parentNode.parentNode.id).data("data")
		});
		$("#clipboard").animate({
			marginRight: parseInt($("#clipboard").css('marginRight'),10) == 0 ?
				$("#clipboard").outerWidth() : 0
		});
	},
	
	preview_node: function(event){
		event.preventDefault();
		var data = $("#"+event.target.parentNode.parentNode.id).data("data");
		var topic_list = [];
		var add = data;
		for(var i = 0; i < 3; i++){
			if(add.attributes.parent){
				add = add.attributes.parent;
				topic_list.unshift(add);
			}
		}
		var PreviewerViews = require("edit_channel/previewer/views");
		new PreviewerViews.PreviewerView({
			el: $("#previewer-area"),
			model: {file: data.attributes, parent: topic_list}
		});
		$("#previewer").css("margin-right", - $("#previewer").outerWidth());
		$("#previewer").animate({
			marginRight: parseInt($("#previewer").css('marginRight'),10) == 0 ?
				$("#previewer").outerWidth() : 0
		});
	},
	
	add_content: function(event){
		event.preventDefault();
		new ClipboardViews.ClipboardAddContentView({
			el: $("#clipboard-area"),
			//model: this.model //INSERT ROOT NODE TO ADD TO RIGHT TREE
		});
		$("#clipboard").animate({
		marginRight: parseInt($("#clipboard").css('marginRight'),10) == 0 ?
			$("#clipboard").outerWidth() :
			0
		});
	},
	
	add_folder: function(event){
		event.preventDefault();
		var view = new ClipboardViews.ClipboardAddFolderView({
			el: $("#clipboard-area"),
			//model: event.target.parentnode... //include topic tree root to know which tree to add to
		});
		$("#clipboard").animate({
		marginRight: parseInt($("#clipboard").css('marginRight'),10) == 0 ?
			$("#clipboard").outerWidth() :
			0
		});
	},
	
	delete_content: function (event){
		if(confirm("Are you sure you want to delete the selected files?"))
		{
			console.log("Deleting Content");
			var selected = $('#edit_container_area').find('input:checked + .file');
			for(var i = 0; i < selected.length; i++)
				console.log($("#"+selected[i].parentNode.id).data("data").attributes);
		}
	},
	
	copy_content: function(event){
		var selected = $('#edit_container_area').find('input:checked + label');
		console.log("Copying Content");
		for(var i = 0; i < selected.length; i++)
			console.log($("#"+selected[i].parentNode.id).data("data").attributes);
	}
});

/* Helper function loads the next directory's files */
function loadTree(folder, topic_node, topic_nodes, content_nodes){
	/* Handle user opening earlier directories */
	if(folder){
		var ind = folder.getAttribute('data-val');
		while(container_number - ind >= 1) //opening folder from earlier directory
		{
			//console.log("Removing container " + "#container_"+container_number);
			$("#container_"+container_number).remove();
			container_number--;
		}
	}
	
	/* Create unique id for next container */
	container_number++;
	var containerid = "#container_" + container_number;
	//console.log(containerid);
	
	/* Create container and add animations */
	var channel_template = require("./hbtemplates/edit_container.handlebars");
	
	//handle any titles that are too long
	var title = topic_node.toJSON().title;
	if(title.trim().length > 25)
		title = title.substring(0, 22) + "...";
	$("#container_"+(container_number-1)).css('z-index', '100');
	$('#edit_container_area').append(channel_template({title: title, index: container_number, topic: topic_node.toJSON(), topicnodes: topic_nodes}));
	$(containerid).css('margin-left', -$(containerid).outerWidth());
	$(containerid).css('z-index', '-100');
	$(containerid).animate({
		marginLeft: parseInt($(containerid).css('marginLeft'),10) == 0 ?
			$(containerid).outerWidth() : 0
	});
	$(containerid).css('z-index', '0');
	$(containerid).wrap("<td>");
	$("td:empty").remove();
	
	var list_index = 0;
	
	/* Retreive all topic nodes that are a child of parent */
	/* Todo: figure out better way of doing this... */
	topic_nodes.forEach(function(entry)
	{
		if(entry.attributes.parent == topic_node)
		{
			var folder_template = require("./hbtemplates/edit_folder.handlebars");
			$(containerid + " ul").append(folder_template({index: container_number, list_index: list_index, folder: entry.attributes}));
			$("#item_"+container_number+"_"+list_index).data("data",entry);
			
			//handle any titles that are too long
			var head = $("#item_"+container_number+"_"+list_index + " h3").text();
			if(head.trim().length > 15)
				$("#item_"+container_number+"_"+list_index + " h3").text(head.substring(0, 12) + "...");
				
			//handle any descriptions that are too long
			var p = $("#item_"+container_number+"_"+list_index + " p").text();
			if(p.trim().length > 100)
			{
				$("#item_"+container_number+"_"+list_index + " p").text(p.substring(0, 87));
				$("#item_"+container_number+"_"+list_index + " p").append("<a title=\""+ p + "\">... read more</a>");
			}
			list_index ++;
		}
	});
	
	/* Retreive all content nodes that are a child of parent */
	/* Todo: figure out better way of doing this... */
	content_nodes.forEach(function(entry)
	{
		if(entry.attributes.parent == topic_node)
		{
			var file_template = require("./hbtemplates/edit_file.handlebars");
			$(containerid + " ul").append(file_template({index: container_number, list_index: list_index, file: entry.attributes}));
			$("#item_"+container_number+"_"+list_index).data("data", entry);
			
			//handle any titles that are too long
			var head = $("#item_"+container_number+"_"+list_index + " h4").text();
			if(head.trim().length > 23)
				$("#item_"+container_number+"_"+list_index + " h4").text(head.substring(0, 20) + "...");
			list_index ++;
		}
	});

	/* Load default text if no items found under directory */
	if(list_index ==0)
		$(containerid + " ul").append("<h5 class=\"default-item\">No content found.</h5>");
	
	/* Make sure next container's index will start at next number */
	container_number = $('#edit_container_area').find('.content-container').length;
}

module.exports = {
	TreeEditView: TreeEditView
}