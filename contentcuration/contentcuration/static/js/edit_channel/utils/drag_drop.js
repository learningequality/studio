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
			id: item.model.id, 
			data : $(this).wrap('<div/>').parent().html(),
		}));
		/*
		e.originalEvent.dataTransfer.effectAllowed = effect;
		e.target.style.opacity = '0.4';
		console.log("data at this point", item.$el.data("data"));
		*/
		window.transfer_data = item.$el.data("data");
		console.log("is", item.$el.data("data"));
		console.log("setting...", window.transfer_data);
	});
	item.$el.on("dragend", function(e){
		e.target.style.opacity = '1';
		//item.$el.data("data", item);
	});
}


/* handleDrop: adds dropping ability to a certain container
*	Parameters:
*		container: container to add dropping ability to
*/
function handleDrop(container, effect){
	//container.$el.data("container", container);
	container.$el.on('dragover', function(e){
		if (e.preventDefault) e.preventDefault();
		e.originalEvent.dataTransfer.dropEffect = effect;

		return false;
	});
	container.$el.on('dragenter', function(e){
		return false;
	});

	container.$el.on('drop', function(e, container){
		if (e.stopPropagation) e.stopPropagation();
		/*
		var transfer = JSON.parse(e.originalEvent.dataTransfer.getData("data"));
		console.log("original event", e.originalEvent.dataTransfer);
		var data = transfer.$el.data("data");
		
		console.log("setting data as", data);
		$(this).data("container").add_to_container({
			data : data, 
			is_folder: transfer.is_folder
		});
*/
		$(this).data("container").add_to_container({
			data : window.transfer_data, 
		});
	});
}



module.exports = {
	handleDrag: handleDrag,
	handleDrop : handleDrop
}