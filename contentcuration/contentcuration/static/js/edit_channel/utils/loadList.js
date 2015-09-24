/* Helper function loads previewer */
function loadList(topic_nodes, content_nodes, folder_template, file_template, list_id){	
	$(list_id).empty();
	var list_index = 0;
	//Retreive all topic nodes that are a child of parent
	topic_nodes.forEach(function(entry)
	{
		$(list_id).append(folder_template({index: list_index, file: entry.attributes}));
		$("#item_"+list_index).data("data",entry);
		$("#item_"+list_index).data("collapsed", true);
		list_index ++;
	});
	
	//Retreive all content nodes that are a child of parent
	content_nodes.forEach(function(entry)
	{
		$(list_id).append(file_template({index: list_index, file: entry.attributes}));
		$("#item_"+list_index).data("data", entry);
		$("#item_"+list_index).data("collapsed", true);
		list_index ++;
	});

	return list_index;
}

function appendList(file,template, list_id, index)
{
	$(list_id).append(template({index: index, file: file.attributes}));
	$("#item_"+index).data("data", file);
	$("#item_"+index).data("collapsed", true);
	return index + 1;
}

module.exports = {
	loadList: loadList
}