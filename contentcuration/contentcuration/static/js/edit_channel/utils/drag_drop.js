/* handleDrag: adds dragging ability to a certain item
*	Parameters:
*		itemid: item to add dragging ability to
*	TODO:
* 		Handle when multiple items are checked to be moved
*/
function handleDrag(item, effect){
	item.$el.on("dragstart", function(e){
		e.originalEvent.dataTransfer.setData("data", JSON.stringify({
			id: item.model.id, 
			data : $(this).wrap('<div/>').parent().html(),
		}));
		e.originalEvent.dataTransfer.effectAllowed = effect;
		e.target.style.opacity = '0.4';
		window.transfer_data = item.$el.data("data");
		console.log("data is", window.transfer_data);
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
function handleDrop(element){
	var oldContainer;
	var item_height = 0;
	var target;
	element.$el.find("ul.content-list").sortable({
		group: 'sortable_list',
	  	connectWith: '.content-list',
	  	exclude: '.current_topic, .default-item',
	  	delay:100,
	  	revert:true,
	  // animation on drop
	  
		onDrop: function  ($item, container, _super) {
			var $clonedItem = $('<li/>').css({height: 0});
			$item.before($clonedItem);
			$clonedItem.animate({'height': $item.height()});
			$item.animate($clonedItem.position(), function  () {
				$clonedItem.detach();
				_super($item, container);
			});
			if(target.data("data"))
				target.data("data").containing_list_view.add_to_container(window.transfer_data, target);			
		},

	    // set $item relative to cursor position*/
		onDragStart: function ($item, container, _super) {
			window.transfer_data = $item.data("data");
			console.log("WINDOW IS NOW ", window.transfer_data);
			
			var offset = $item.offset(),
			pointer = container.rootGroup.pointer;
			adjustment = {
				left: pointer.left - offset.left,
				top: pointer.top - offset.top
			};
			item_height = $item.height();
		    _super($item, container);
	  	},

		onDrag: function ($item, position) {
			$item.css({
				left: position.left - adjustment.left,
				top: position.top - adjustment.top
			});
		},

		afterMove: function (placeholder, container, $closestItemOrContainer) {
			placeholder.height(item_height);
			target = $closestItemOrContainer;
	    	//console.log("near item", $closestItemOrContainer);
	    },
	});
}

function destroy(element){
	element.$el.find("ul.content-list").sortable("destroy");
}

module.exports = {
	handleDrag : handleDrag,
	handleDrop : handleDrop,
	destroy : destroy
}