/* Helper function loads the next directory's files */
function loadTree(folder, topic_node, topic_nodes, content_nodes, container_number, edit){
	var channel_template = require("./../hbtemplates/content_container.handlebars");
	var folder_template = require("./../hbtemplates/content_folder.handlebars");
	var file_template = require("./../hbtemplates/content_file.handlebars");
	
	var ind = (folder) ? folder.getAttribute('data-val') : container_number;
	while(container_number - ind >= 1){ //opening folder from earlier directory
		$("#container_"+container_number).remove();
		container_number--;
	}
	
	/* Create unique id for next container */
	container_number++;
	var containerid = "#container_" + container_number;
	
	/* Create container and add animations */
	$("#container_"+(container_number-1)).css('z-index', '100');
	
	//handle titles that are too long
	var title = topic_node.attributes.title;
	if(title.trim().length > 25)
		title = title.substring(0, 22) + "...";
	$("#container_area").append(channel_template({title: title, index: container_number, topic: topic_node.attributes, topicnodes: topic_nodes, edit: edit}));
	$("#container_area").css("width", $("#container_" + container_number).innerWidth() * (container_number + 1));
	$(containerid).css('margin-left', -$(containerid).outerWidth());
	$(containerid).css('z-index', '-100');
	$(containerid).animate({
		marginLeft: parseInt($(containerid).css('marginLeft'),10) == 0?
			$(containerid).outerWidth() : 0
	});
	$(containerid).css('z-index', '0');
	
	var textHelper = require("edit_channel/utils/trimText");
	
	/* Retreive all content nodes that are a child of parent */
	/* Todo: figure out better way of doing this... */
	var list_index = 0;
	topic_nodes.forEach(function(entry){
		if(entry.attributes.parent == topic_node){
			$(containerid + " ul").append(folder_template({index: container_number, list_index: list_index, folder: entry.attributes, edit: edit}));
			var itemid = "#item_"+container_number+"_"+list_index;
			$(itemid).data("data",entry);
			$(itemid + " h3").html(textHelper.trimText($(itemid + " h3").text(), "...", 15, false));
			$(itemid + " p").html(textHelper.trimText($(itemid + " p").text(), "... read more", 90, true));
			list_index ++;
		}
	});
	
	content_nodes.forEach(function(entry){
		if(entry.attributes.parent == topic_node){
			$(containerid+ " ul").append(file_template({index: container_number, list_index: list_index, file: entry.attributes, edit: edit}));
			var itemid = "#item_"+container_number+"_"+list_index;
			$(itemid).data("data", entry);
			$(itemid + " h4").html(textHelper.trimText($(itemid + " h4").text(), "...", 25, false));
			list_index ++;
		}
	});

	if(list_index ==0)
		$(containerid + " ul").append("<h5 class=\"default-item\">No content found.</h5>");
	
	return container_number;
}

module.exports = {
	loadTree: loadTree
}