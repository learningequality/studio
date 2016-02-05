/* handleDrop: adds dropping ability to a certain container
*	Parameters:
*		container: container to add dropping ability to
*/
function addDragDrop(element){
	var oldContainer;
	var item_height = 0;
	var target;
	var isaboveclosest;
	element.$el.find("ul.content-list").sortable({
		group: 'sortable_list',
	  	connectWith: '.content-list',
	  	exclude: '.current_topic, .default-item',
	  	delay:100,
	  	revert:true,
	  // animation on drop
	  
		onDrop: function  ($item, container, _super) {
			console.log("closest item is", target.data("data"));
			console.log("placeholder is above closest item", isaboveclosest);
			target.data("isbelow", isaboveclosest);
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
			isaboveclosest = $closestItemOrContainer.offset().top > $(placeholder).offset().top;
			target = $closestItemOrContainer;
	    	//console.log("near item", $closestItemOrContainer);
	    },
	});
}

function removeDragDrop(element){
	element.$el.find("ul.content-list").sortable("destroy");
}

module.exports = {
	addDragDrop : addDragDrop,
	removeDragDrop : removeDragDrop,
}