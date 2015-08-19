var Backbone = require("backbone");
var _ = require("underscore");

require("preview.less");
var container_number; // Better to find other way to identify unique container

var TreePreviewView = Backbone.View.extend({
	template: require("./hbtemplates/preview.handlebars"),

	initialize: function() {
		_.bindAll(this, 'openFolder', 'previewFile');
		//this.listenTo(this.model, "change:number_of_topics", this.render);
		this.render();
	},
	render: function() {
		this.$el.html(this.template(this.model));
		container_number = 1;
		$("td:empty").remove();
		$("#preview_container_area").wrapInner("<table cellspacing='0px'><tr>");
		loadTree(null, this.model.topic.get("root_node"), this.model.topicnodes, this.model.contentnodes);
	},
	events: {
		'click .folder': 'openFolder',
		'click .file': 'previewFile'
	},
	openFolder: function(event){
		var el = event.target.parentNode.parentNode;
		loadTree(el, $("#"+el.id).data("folder"),
			this.model.topicnodes, this.model.contentnodes)
	},
	previewFile: function(event){
		var PreviewerViews = require("edit_channel/previewer/views");
		var data = $("#"+event.target.parentNode.id).data("file");
		var topic_list = [];
		var add = data;	
		for(var i = 0; i < 3; i++){
			if(add.attributes.parent){
				add = add.attributes.parent;
				topic_list.unshift(add);
			}
		}
		new PreviewerViews.PreviewerView({
			el: $("#previewer-area"),
			model: {file: data.attributes, parent: topic_list}
		});
		$("#previewer").css("margin-right", - $("#previewer").outerWidth());
		$("#previewer").animate({
			marginRight: parseInt($("#previewer").css('marginRight'),10) == 0 ?
				$("#previewer").outerWidth() : 0
		}); 
	}
});

/* Helper function loads the next directory's files */
function loadTree(folder, topic_node, topic_nodes, content_nodes){
	if(folder){
		var ind = folder.getAttribute('data-val');
		while(container_number - ind >= 1){ //opening folder from earlier directory
			//console.log("Removing container " + "#container_"+container_number);
			$("#container_"+container_number).remove();
			container_number--;
		}
	}
	
	/* Create unique id for next container */
	container_number++;
	var containerid = "#container_" + container_number;
	
	/* Create container and add animations */
	var channel_template = require("./hbtemplates/preview_container.handlebars");
	$("#container_"+(container_number-1)).css('z-index', '100');

	//handle titles that are too long
	var title = topic_node.toJSON().title;
	if(title.trim().length > 25)
		title = title.substring(0, 22) + "...";
	$('#preview_container_area').append(channel_template({title: title, index: container_number, topic: topic_node.toJSON(), topicnodes: topic_nodes}));
	$(containerid).css('margin-left', -$(containerid).outerWidth());
	$(containerid).css('z-index', '-100');
	$(containerid).animate({
		marginLeft: parseInt($(containerid).css('marginLeft'),10) == 0?
			$(containerid).outerWidth() : 0
	});
	$(containerid).css('z-index', '0');
	$(containerid).wrap("<td>");
	$("td:empty").remove();
	
	/* Retreive all content nodes that are a child of parent */
	/* Todo: figure out better way of doing this... */
	var list_index = 0;
	topic_nodes.forEach(function(entry){
		if(entry.attributes.parent == topic_node){
			var folder_template = require("./hbtemplates/preview_folder.handlebars");
			$(containerid + " ul").append(folder_template({index: container_number, list_index: list_index, folder: entry.attributes}));
			$("#item_"+container_number+"_"+list_index).data("folder",entry);
			
			//handle titles that are too long
			var head = $("#item_"+container_number+"_"+list_index + " h3").text();
			if(head.trim().length > 25)
				$("#item_"+container_number+"_"+list_index + " h3").text(head.substring(0, 22) + "...");
				
			//handle descriptions that are too long
			var p = $("#item_"+container_number+"_"+list_index + " p").text();
			if(p.trim().length > 120){
				$("#item_"+container_number+"_"+list_index + " p").text(p.substring(0, 107));
				$("#item_"+container_number+"_"+list_index + " p").append("<a title=\"" + p + "\">... read more</a>");
			}
			list_index ++;
		}
	});
	
	content_nodes.forEach(function(entry){
		if(entry.attributes.parent == topic_node){
			var folder_template = require("./hbtemplates/preview_file.handlebars");
			$(containerid+ " ul").append(folder_template({index: container_number, list_index: list_index, file: entry.attributes}));
			$("#item_"+container_number+"_"+list_index).data("file", entry);
			
			//handle titles that are too long
			var head = $("#item_"+container_number+"_"+list_index + " h4").text();
			if(head.trim().length > 30)
				$("#item_"+container_number+"_"+list_index + " h4").text(head.substring(0, 27) + "...");
			list_index ++;
		}
	});

	if(list_index ==0)
		$(containerid + " ul").append("<h5 class=\"default-item\">No content found.</h5>");
}

module.exports = {
	TreePreviewView: TreePreviewView
}