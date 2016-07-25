/* handleDrop: adds dropping ability to a certain container
*	Parameters:
*		container: container to add dropping ability to
*/
function addDragDrop(element){
	var oldContainer;
	var item_height = 0;
	var target;
	var isaboveclosest;

	element.$el.find(".content-list").sortable({
		 //    items: "li",
		 //    delay:200,
		 //    revert:true,
		 //    cursor:"move",
		 //    distance:20,
			placeholder: "sorting-placeholder",
			forcePlaceholderSize: true,
			scroll:true,
		   	scrollSensitivity: 100,
		   	scrollSpeed: 10,
		   	connectWith: '.content-list',

		 //    containment: 'body',
		 //    onDragStart: function ($item, container, _super,event) {
			// 	window.transfer_data = $item.data("data");
			// 	$item.css({
			// 		"position" : "absolute",
			// 		"z-index" : "999999999999",
			// 		"opacity" : "0.7",
			// 		"padding-left" : "5px"
			// 	});
			// 	$item.find("input").css("display", "none");
			// 	$item.addClass(container.group.options.draggedClass)
   //    			$("body").addClass(container.group.options.bodyClass)
			// 	// var offset = $item.position(),
			// 	// pointer = container.rootGroup.pointer;
			// 	// adjustment = {
			// 	// 	left: pointer.left - offset.left,
			// 	// 	top: pointer.top - offset.top
			// 	// }
			// }
	});
}

function addDroppable(element){
	if(!element.$el.hasClass("droppable_container")){
		element.$el.addClass("droppable_container");
		element.$el.droppable({
			items : 'li',
			cancel: '.current_topic, .default-item, #preview li',
			drop: function( event, ui ) {
	        	console.log("dropped!");
	      	}
		})
	}
}

function removeDragDrop(element){
	element.$el.removeClass("droppable_container");
	// element.$el.find("ul.content-list").sortable("destroy");
}

module.exports = {
	addDragDrop : addDragDrop,
	removeDragDrop : removeDragDrop,
	addDroppable:addDroppable
}