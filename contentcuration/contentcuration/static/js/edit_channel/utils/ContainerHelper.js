var channel_template = require("./../hbtemplates/content_container.handlebars");
var folder_template = require("./../hbtemplates/content_folder.handlebars");
var file_template = require("./../hbtemplates/content_file.handlebars");
var DOMHelper = require("edit_channel/utils/DOMHelper");
var textHelper = require("edit_channel/utils/TextHelper");

/* loadRootContainer: loads the channel's root directory
*	Parameters:
*		topic_node: root directory to start with
*		edit: indicates if under edit mode or preview mode
*		topic_nodes: all topics under channel
*		content_nodes: all content files under channel	
*	TODO: 
* 		Get rid of passing in topic_nodes and content_nodes (Get from db)
*		Add way to change default container's channel name
*/
function loadRootContainer(topic_node, edit, topic_nodes, content_nodes){
	/* If no content exists in channel, create default container */
	if(!topic_node)
		topic_node = {title: "Untitled", description: "No description"};
	
	/* Create container for channel root */
	$("#container_area").append(channel_template({title: topic_node.name, index: 0, topic: topic_node, edit: edit}));
	animateContainer(0);
	handleTitle("#container_0");
	if(edit) handleDrop("#container_0");
	
	/* Set data for container to access when needed */
	$("#container_0").data("channel", topic_node);
	
	/* Load folders and files */
	var list_index = loadTopics(0, topic_node, topic_nodes, edit);
	list_index = loadFiles(0, topic_node, content_nodes, list_index, edit);

	/* Attach default message if no content found */
	if(list_index ==0)
		$("#container_0 ul").append("<li id=\"item_0_0\"><h5 class=\"default-item\">No content found.</h5></li>");
}

/* loadContainer: opens folder's directory
*	Parameters:
*		folder: DOM element to manipulate
*		topic_node: root directory to start with
*		topic_nodes: all topics under channel
*		content_nodes: all content files under channel
*		edit: indicates if under edit mode or preview mode
*		container_number: index of last container already rendered
*	TODO: 
* 		Get rid of passing in topic_nodes and content_nodes (Get from db)
*		Add way to change default container's channel name
*/
function loadContainer(folder, topic_node, edit, topic_nodes, content_nodes, container_number){
	/* Close other open containers until reach container of selected folder */
	var ind = folder.parentNode.getAttribute('data-val');
	while(container_number - ind >= 1){ //opening folder from earlier directory
		$("#container_"+container_number).remove();
		container_number--;
	}
	handleOpenedFolderAppearance(container_number, folder, edit);
	$("#" + folder.parentNode.id + " label").animate({width: '341px'}, { queue: false });
	$("#" + folder.parentNode.id + " label").animate({paddingRight: '49px'}, { queue: false });
	addScrollListener(folder);

	/* Create unique id for next container */
	container_number++;
	var containerid = "#container_" + container_number;

	/* Create container for directory */
	$("#container_area").append(channel_template({title: topic_node.title, index: container_number, topic: topic_node, edit: edit}));
	animateContainer(container_number);
	handleTitle("#container_" + container_number);
	if(edit) handleDrop(containerid);
	
	/* Set data for container to access when needed */
	$(containerid).data("channel", topic_node);
	
	/* Load folders and files */
	var list_index = loadTopics(container_number, topic_node, topic_nodes, edit);
	list_index = loadFiles(container_number, topic_node, content_nodes, list_index, edit);
	
	/* Attach default message if no content found */
	if(list_index ==0)
		$(containerid + " ul").append("<li id=\"item_0_0\"><h5 class=\"default-item\" >No content found.</h5></li>");
	
	return container_number;
}

/* handleOpenedFolderAppearance: Manages appearance of opened folder
*	Parameters:
*		container_number: index of container of folder to handle
*		folder: DOM element to style
*	TODO: 
* 		Use LESS variables instead of hard-coded values
*/
function handleOpenedFolderAppearance(container_number, folder, edit){
	var notSelected = $("#container_"+container_number).find('.folder');
	$("#container_"+container_number + " label").off();
	for(var i = 0; i < notSelected.length; i++){
		if(notSelected[i].parentNode.id.indexOf("new") >= 0) continue;
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
}


/* handleTitle: Manages css of channel container
*	Parameters:
*		container_id: container of title to handle
*	TODO: 
* 		Depending on css, might be able to get rid of this entirely
*/
function handleTitle(container_id){
	$(container_id + " .container-interior").css('margin-top', (-$(container_id + " .title-bar").height() + 22) + "px");
	$(container_id + " canvas").css('margin-top', (-$(container_id + " .title-bar").height() + 22) + "px");
	$(container_id + " .content-list").height(($(container_id + " canvas").height() - $(container_id + " .title-bar").height() + 6) + "px");
}

/* loadTopics: loads directory's folders
*	Parameters:
*		container_number: index of container to add folders to
*		topic_node: root directory to match
*		topic_nodes: all topics under channel
*		edit: indicates if under edit mode or preview mode
*	TODO: 
* 		Optimize way to find all folders under a directory
*/
function loadTopics(container_number, topic_node, topic_nodes, edit){
	var list_index = 0;
	topic_nodes.forEach(function(entry){
		if(entry.parent == topic_node){
			$("#container_"+ container_number + " ul").append(folder_template({index: container_number, list_index: list_index, folder: entry, edit: edit}));
			var itemid = "#item_" + container_number + "_"+list_index;
			$(itemid).data("data",entry);
			if(edit) handleDrag(itemid);
			$(itemid + " h3").html(textHelper.trimText($(itemid + " h3").text(), "...", 22, false));
			$(itemid + " p").html(textHelper.trimText($(itemid + " p").text(), "... read more", 120, true));

			list_index ++;
		}
	});
	return list_index;
}

/* addScrollListener: Attach event listener to opened folder
*	Parameters:
*		folder: DOM element to attach listener to
*	TODO: 
* 		Optimize way to find all folders under a directory
*/
function addScrollListener(folder){
	// 
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
}

/* loadFiles: loads directory's files
*	Parameters:
*		container_number: index of container to add folders to
*		topic_node: root directory to match
*		content_nodes: all files under channel
*		list_index: number of first item in list of files
*		edit: indicates if under edit mode or preview mode
*	TODO: 
* 		Optimize way to find all files under a directory
*/
function loadFiles(container_number, topic_node, content_nodes, list_index, edit){
	content_nodes.forEach(function(entry){
		if(entry.parent == topic_node){
			$("#container_"+ container_number + " ul").append(file_template({index: container_number, list_index: list_index, file: entry, edit: edit}));
			var itemid = "#item_" + container_number + "_"+list_index;
			$(itemid).data("data", entry);
			$(itemid + " h4").html(textHelper.trimText($(itemid + " h4").text(), "...", 25, false));
			if(edit) handleDrag(itemid);
			list_index ++;
		}
	});
	return list_index;
}

/* loadRootContainer: loads the channel's root directory
*	Parameters:
*		topic_node: root directory to start with
*		topic_nodes: all topics under channel
*		content_nodes: all content files under channel
*		edit: indicates if under edit mode or preview mode
*	TODO: 
* 		Get rid of passing in topic_nodes and content_nodes (Get from db)
*		Add way to change default container's channel name
*/
function appendList(file,template, list_id, index, list_index) {
	$(".default-item").remove();
	$(list_id).append(template({index: index, list_index:list_index, file: file}));
	$("#item_"+index).data("data", file);
	$("#item_"+index).data("collapsed", true);
	return index + 1;
}

/* animateContainer: animates a given container when loading
*	Parameters:
*		container_number: index of container to animate
*/
function animateContainer (container_number){
	/* Set starting point of container to animate */
	$("#container_" + container_number).css({'margin-left': -$("#container_" + container_number).outerWidth(), 
							'z-index': 1000 - container_number
						});
	/* Increase size of container area to accomodate for size of new container */
	$("#container_area").css('width', $("#container_area").innerWidth() + $("#container_" + container_number).outerWidth());
	
	$("#container_" + container_number).animate({
		marginLeft: parseInt($("#container_" + container_number).css('marginLeft'),10) == 0?
			$("#container_" + container_number).outerWidth() : 0
	});
}

/* onOffsetChanged: handles when selected folder is offscreen */
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

/* handleDrag: adds dragging ability to a certain item
*	Parameters:
*		itemid: item to add dragging ability to
*	TODO:
* 		Handle when multiple items are checked to be moved
*/
function handleDrag(itemid){
	$(itemid).on("dragstart", function(e){
		
		e.originalEvent.dataTransfer.setData("data", JSON.stringify({ "data" : $("#"+e.originalEvent.target.id).data("data"), 
											"is_folder" : $("#"+e.originalEvent.target.id + " label").hasClass("folder"),
											"original_id" : "#" + e.originalEvent.target.id, edit : true}));
		e.originalEvent.dataTransfer.effectAllowed = "copyMove";
		//e.target.style.opacity = '0.4';
	});
	$(itemid).on("dragend", function(e){
		e.target.style.opacity = '1';
	});
}

/* handleDrag: adds dropping ability to a certain container
*	Parameters:
*		containerid: container to add dropping ability to
*/
function handleDrop(containerid){
	$(containerid).on('dragover', function(e){
		if (e.preventDefault) e.preventDefault();
		e.originalEvent.dataTransfer.dropEffect = 'move';
		return false;
	});
	$(containerid).on('dragenter', function(e){
		return false;
	});

	$(containerid).on('drop', function(e){
		if (e.stopPropagation) e.stopPropagation();
		var transfer = JSON.parse(e.originalEvent.dataTransfer.getData("data"));
		var list_index = parseInt($("#" + this.id + " li:last-child").attr("id").split("_")[2]) + 1;
		var template = (transfer.is_folder)? require("./../hbtemplates/content_folder.handlebars") : require("./../hbtemplates/content_file.handlebars");
		console.log(e.originalEvent);
		console.log(document.elementFromPoint(e.originalEvent.screenX, e.originalEvent.screenY));
		
		//document.elementFromPoint(x, y);
		var el = DOMHelper.getParentOfTag(e.target, "li");
		if(!el){
			appendList(transfer.data,template, "#" + this.id + " ul", this.id.split("_")[1], list_index);
		}
		else{
			
		}
		
		//console.log(el);
		/*
			$("#container_"+ container_number + " ul").append(folder_template({index: container_number, list_index: list_index, folder: entry.attributes, edit: edit}));
			var itemid = "#item_" + container_number + "_"+list_index;
			$(itemid).data("data",entry);
			if(edit) handleDrag(itemid);
			$(itemid + " h3").html(textHelper.trimText($(itemid + " h3").text(), "...", 22, false));
			$(itemid + " p").html(textHelper.trimText($(itemid + " p").text(), "... read more", 120, true));
			list_index ++;
		*/
		//appendList(transfer.data,template, "#" + this.id + " ul", this.id.split("_")[1], list_index);
		$(transfer.original_id).remove();
		//console.log(transfer.data);
		//console.log(transfer.is_folder);
		//console.log($("#" + this.id));
	});
}



module.exports = {
	loadContainer: loadContainer,
	appendList: appendList,
	loadRootContainer:loadRootContainer
}