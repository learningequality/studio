/* Helper function loads previewer */
function loadList(root_node, model, folder_template, file_template, list_id, indent, options, list_index, indenter){	
	model.topicnodes.forEach(function(entry){
		if(entry.attributes.parent == root_node){
			$(list_id).append(folder_template({index: list_index, file: entry.attributes, folder: true, file_icon: "folder-open", options: options}));
			$("#item_"+list_index).data("data",entry);
			$("#item_"+list_index).data("collapsed", true);
			$("#item_"+list_index+" label").css("margin-left",  indent*indenter + "px");
			$("#item_"+list_index+" label").width($("#item_"+list_index+" label").width() - (indent*indenter));
			var temp_index = loadList(entry, model, folder_template, file_template, "#item_"+list_index+"_sub", indent, options, list_index + 1, indenter + 1);
			if(temp_index == list_index + 1){ //No sub items found
				$("#item_"+list_index+" label .tog_folder").prop("disabled", true);
				$("#item_"+list_index+" label .tog_folder").css("cursor", "not-allowed");
			}
			list_index = temp_index;
		}
	});
	model.contentnodes.forEach(function(entry){
		if(entry.attributes.parent == root_node){
			var file_type = ""; //getExtension(this.file.data("data").attributes.content_file.[filename]);
			var icon;
			switch(file_type){
				case "pdf":
					icon = "file";
					break;
				case 'm4v':
				case 'avi':
				case 'mpg':
				case 'mp4':
					icon = "volume-up";
					break;
				default: //video by default
					icon = "facetime-video";
			}
			$(list_id).append(file_template({index: list_index, file: entry.attributes, folder: false, file_icon: icon, options: options}));
			$("#item_"+list_index).data("data", entry);
			$("#item_"+list_index).data("collapsed", true);
			$("#item_"+list_index+" label").css("margin-left",  indent*indenter + "px");
			$("#item_"+list_index+" label").width($("#item_"+list_index+" label").width() - (indent*indenter));
			list_index ++;
		}
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
	loadList: loadList,
	appendList: appendList
}