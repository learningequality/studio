/* Helper function loads previewer */
function loadPreview(file){
	var topic_list = [];
	var parent_data = file;
	for(var i = 0; i < 3; i++){
		if(parent_data.attributes.parent){
			parent_data = parent_data.attributes.parent;
			topic_list.unshift(parent_data);
		}
	}
	
	var file_type; //defaults to video
	/* Todo: ADD CHECK FOR FILE_TYPE */
	/*
	switch (getExtension(file.content_file.[filename])) {
		case 'pdf':
			file_type = "pdf";
			break;
		case 'm4v':
		case 'avi':
		case 'mpg':
		case 'mp4':
			file_type = "audio";
	}
	*/

	var PreviewerViews = require("edit_channel/previewer/views");
	var view = new PreviewerViews.PreviewerView({
		el: $("#previewer-area"),
		model: {file: file.attributes, parent: topic_list},
		file_type: file_type
	});
	
	$("#previewer").css("margin-right", - $("#previewer").outerWidth());
	$("#previewer").animate({
		marginRight: parseInt($("#previewer").css('marginRight'),10) == 0 ?
			$("#previewer").outerWidth() : 0
	}); 
}
module.exports = {
	loadPreview: loadPreview
}