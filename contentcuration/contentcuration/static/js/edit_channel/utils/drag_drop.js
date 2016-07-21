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
	  	exclude: '.current_topic, .default-item, #preview li',
	  	delay:50,
	  	revert:true,
	 	// animation on drop
	 	/*
  		start: function(event,ui) {
			var element = $(ui.item[0]);
			element.data('lastParent', element.parent());
		},
		update: function(event,ui) {
			var element = $(ui.item[0]);
			if (element.hasClass('loading')) return;
			element.addClass('loading');
			$.ajax({
				    url:'/ajax',
				    context:element,
				    complete:function(xhr,status) {
				    $(this).removeClass('loading');
				    if (xhr.status != 200) {
				    $($(this).data('lastParent')).append(this);
				    }
			    },
			});
		},*/

		onDrop: function  ($item, container, _super) {
			target.data("isbelow", isaboveclosest);
			var $clonedItem = $('<li/>').css({height: 0});
			$item.before($clonedItem);
			$clonedItem.animate({'height': $item.height()});
			$item.animate($clonedItem.position(), function  () {
				$clonedItem.detach();
				_super($item, container);
			});

			if(target.data("data"))
				target.data("data").containing_list_view.drop_in_container(window.transfer_data, target);
			else if(target.data("list"))
				target.data("list").drop_in_container(window.transfer_data, target);
		},

	    // set $item relative to cursor position*/
		onDragStart: function ($item, container, _super) {
			window.transfer_data = $item.data("data");
			$item.css("z-index", "99999999999999999999");
			var offset = $item.offset(),
			pointer = container.rootGroup.pointer;
			adjustment = {
				left: pointer.left - offset.left,
				top: pointer.top - offset.top
			};
		    _super($item, container);
	  	},
	  	onDragEnd: function ($item, container, _super) {
		    _super($item, container);
	  	},

		onDrag: function ($item, position) {
			$item.css({
				left: position.left - adjustment.left,
				top: position.top - adjustment.top
			});
		},

		afterMove: function (placeholder, container, $closestItemOrContainer) {
			isaboveclosest = $closestItemOrContainer.offset().top > $(placeholder).offset().top;
			target = $closestItemOrContainer;
	    }
	});
}

function removeDragDrop(element){
	element.$el.find("ul.content-list").sortable("destroy");
}

module.exports = {
	addDragDrop : addDragDrop,
	removeDragDrop : removeDragDrop
}