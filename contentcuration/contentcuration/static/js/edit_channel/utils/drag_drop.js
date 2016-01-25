/* handleDrag: adds dragging ability to a certain item
*	Parameters:
*		itemid: item to add dragging ability to
*	TODO:
* 		Handle when multiple items are checked to be moved
*/
function handleDrag(item, effect){
	item.$el.attr('draggable', 'true');
	item.$el.on("dragstart", function(e){
		e.originalEvent.dataTransfer.setData("data", JSON.stringify({
			id: $(this).attr("id"), 
			data : $(this).wrap('<div/>').parent().html(),
			edit : true,
		}));

		e.originalEvent.dataTransfer.effectAllowed = effect;
		e.target.style.opacity = '0.4';
	});
	item.$el.on("dragend", function(e){
		e.target.style.opacity = '1';
	});
}


/* handleDrag: adds dropping ability to a certain container
*	Parameters:
*		containerid: container to add dropping ability to
*/
function handleDrop(container, effect){
	container.$el.on('dragover', function(e){
		if (e.preventDefault) e.preventDefault();
		e.originalEvent.dataTransfer.dropEffect = effect;

		//container.$el.find(".content-list").append("DROP HERE");

		return false;
	});
	container.$el.on('dragenter', function(e){
		return false;
	});

	container.$el.on('drop', function(e, container){
		if (e.stopPropagation) e.stopPropagation();
		var transfer = JSON.parse(e.originalEvent.dataTransfer.getData("data"));
		var data = $("#" + transfer.id).data("data");
		$(this).data("container").add_to_container({
			data : data, 
			is_folder: transfer.is_folder
		});
	});
}



module.exports = {
	handleDrag: handleDrag,
	handleDrop : handleDrop
}