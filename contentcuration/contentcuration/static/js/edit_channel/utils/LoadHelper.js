/* Helper function loads the next directory's files */
function loadContainer(folder, topic_node, topic_nodes, content_nodes, container_number, edit, rendering){
	var channel_template = require("./../hbtemplates/content_container.handlebars");
	var folder_template = require("./../hbtemplates/content_folder.handlebars");
	var file_template = require("./../hbtemplates/content_file.handlebars");
	var DOMHelper = require("edit_channel/utils/DOMHelper");
	if(!rendering){
		var ind = folder.parentNode.getAttribute('data-val');
		while(container_number - ind >= 1){ //opening folder from earlier directory
			$("#container_"+container_number).remove();
			container_number--;
		}
		var notSelected = $("#container_"+container_number).find('.folder');
		$("#container_"+container_number + " label").off();
		for(var i = 0; i < notSelected.length; i++){
			if(notSelected[i].parentNode.id.indexOf("new") >= 0) continue;
			// Todo: Might be better to figure out "default" folder settings by accessing less variables
			notSelected[i].style.backgroundColor="white";
			notSelected[i].style.border="none";
			notSelected[i].style.width = "292px";
			notSelected[i].style.paddingRight = "0px";
		}
		folder.style.backgroundColor= (edit) ? "#CCCCCC" : "#87A3C6";
		folder.style.border="4px solid white";
		folder.style.borderRight="none";
		folder.style.boxShadow="none";
		$("#" + DOMHelper.getParentOfClass(folder, "content-container").id + " .content-list").css("border", "none");
		
		/* Attach event listener to opened folder */
		$("#" + folder.parentNode.id + " label").on("offset_changed", function(){
			var container = $("#" + DOMHelper.getParentOfClass(folder, "content-container").id + " .content-list");
			var el = $("#" + folder.parentNode.id);
			
			if(container.offset().top > el.offset().top + el.height())
				container.css("border-top", "4px solid white");
			else if (container.offset().top + container.height() < el.offset().top)
				container.css("border-bottom", "4px solid white");
			else
				container.css("border", "none");
		});
		
		$("#" + folder.parentNode.id + " label").onOffsetChanged(function(){
			 $("#" + folder.parentNode.id + " label").trigger('offset_changed');
		});
		$("#" + folder.parentNode.id + " label").animate({width: '340px'}, { queue: false });
		$("#" + folder.parentNode.id + " label").animate({paddingRight: '49px'}, { queue: false });
	}
	
	/* Create unique id for next container */
	container_number++;
	var containerid = "#container_" + container_number;
	//$("#container_"+(container_number-1)).css('z-index', '100');
	
	//handle titles that are too long
	var title = topic_node.attributes.title;
	$(containerid).data("channel", topic_node);
	if(edit) handleDrop(containerid);

	$("#container_area").append(channel_template({title: title, index: container_number, topic: topic_node.attributes, edit: edit}));
	$("#container_area").css("width", $("#container_" + container_number).innerWidth() * (container_number + 1));
	$(containerid).css({'margin-left': -$(containerid).outerWidth(),
						'z-index': 1000 - container_number});
	$(containerid + " .container-interior").css('margin-top', (-$(containerid + " .title-bar").height() + 22) + "px");
	$(containerid + " canvas").css('margin-top', (-$(containerid + " .title-bar").height() + 22) + "px");
	$(containerid + " .content-list").height(($(containerid + " canvas").height() - $(containerid + " .title-bar").height() + 6) + "px");
	$(containerid).animate({
		marginLeft: parseInt($(containerid).css('marginLeft'),10) == 0?
			$(containerid).outerWidth() : 0
	});
	
	var textHelper = require("edit_channel/utils/TextHelper");
	
	/* Retreive all content nodes that are a child of parent */
	/* Todo: figure out better way of doing this... */
	var list_index = 0;
	topic_nodes.forEach(function(entry){
		if(entry.attributes.parent == topic_node){
			$(containerid + " ul").append(folder_template({index: container_number, list_index: list_index, folder: entry.attributes, edit: edit}));
			var itemid = "#item_"+container_number+"_"+list_index;
			$(itemid).data("data",entry);
			if(edit) handleDrag(itemid);
			$(itemid + " h3").html(textHelper.trimText($(itemid + " h3").text(), "...", 22, false));
			$(itemid + " p").html(textHelper.trimText($(itemid + " p").text(), "... read more", 120, true));
			list_index ++;
		}
	});
	
	content_nodes.forEach(function(entry){
		if(entry.attributes.parent == topic_node){
			$(containerid+ " ul").append(file_template({index: container_number, list_index: list_index, file: entry.attributes, edit: edit}));
			var itemid = "#item_"+container_number+"_"+list_index;
			$(itemid).data("data", entry);
			$(itemid + " h4").html(textHelper.trimText($(itemid + " h4").text(), "...", 25, false));
			if(edit) handleDrag(itemid);
			list_index ++;
		}
	});

	if(list_index ==0)
		$(containerid + " ul").append("<h5 class=\"default-item\">No content found.</h5>");
	
	return container_number;
}


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

$.fn.onOffsetChanged = function (trigger, millis) {
    if (millis == null) millis = 100;
    var o = $(this[0]); // our jquery object
    if (o.length < 1) return o;

    var lastOff = null;
    setInterval(function () {
        if (o == null || o.length < 1) return o;
        if (lastOff == null) lastOff = o.offset();
        var newOff = o.offset();
        if (lastOff.top != newOff.top) {
            $(this).trigger('onOffsetChanged', { lastOff: lastOff, newOff: newOff});
            if (typeof (trigger) == "function") trigger(lastOff, newOff);
            lastOff= o.offset();
        }
    }, millis);

    return o;
};

function handleDrag(itemid){
	$(itemid).attr("draggable", "true");
	$(itemid).on("dragstart", function(e){
		e.originalEvent.dataTransfer.setData("data", $("#"+e.target.id).data("data"));
		e.target.style.opacity = '0.4';
		
		/* Todo: Go through all checked items to move*/
		if($(itemid + " input[checkbox]").checked){
		console.log("CHECKED");
		}
		
		//console.log(e);
	});
	$(itemid).on("dragend", function(e){
		//e.target.remove();
	});
}

function handleDrop(containerid){
	$(containerid).on('dragover', function(e){
	//	e.preventDefault();
		console.log(" DRAGGED");
	});
	$(containerid).on('dragenter', function(e){
		console.log(" ENTERED");
		e.preventDefault();
		e.stopPropagation();
	});
	$(containerid).on('drop', function(e){
		//e.preventDefault();
		console.log("DROPPED");
		var data = e.originalEvent.dataTransfer.getData("data");
		console.log(data);
		
		 if (e.stopPropagation) {
			e.stopPropagation(); // stops the browser from redirecting.
		  }
		
		
		//console.log(e.originalEvent.target.id + " DROPPED");
		//var data = ev.data;
		/*
		if(e.originalEvent.dataTransfer){
			if(e.originalEvent.dataTransfer.files.length) {
				e.preventDefault();
				e.stopPropagation();
				
				upload(e.originalEvent.dataTransfer.files);
			}   
		}
		*/
	});
}

/*

function handleDragStart(e) {
  e.target.style.opacity = '0.4';  // this / e.target is the source node.
}

function handleDragOver(e) {
  if (e.preventDefault) {
    e.preventDefault(); // Necessary. Allows us to drop.
  }

  e.dataTransfer.dropEffect = 'move';  // See the section on the DataTransfer object.

  return false;
}

function handleDragEnter(e) {
  // this / e.target is the current hover target.
  this.classList.add('over');
}

function handleDragLeave(e) {
  this.classList.remove('over');  // this / e.target is previous target element.
}
*/
module.exports = {
	loadContainer: loadContainer,
	loadList: loadList,
	appendList: appendList
}