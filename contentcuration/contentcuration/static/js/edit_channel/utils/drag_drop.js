/* handleDrop: adds dropping ability to a certain container
*	Parameters:
*		container: container to add dropping ability to
*/
function addDragDrop(element){
	var oldContainer;
	var item_height = 0;
	var target;
	var isaboveclosest;
	element.$el.addClass("dropping-place");
	element.$el.find(".content-list").sortable({
		group: 'sortable_list',
	  	connectWith: '.content-list',
	  	exclude: '.current_topic, .default-item, #preview li',
	  	delay:100,
	  	revert:true,
	  	distance:20,
	  	tolerance:-10,
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

			var target_container;
			if(target.data("data"))
				target_container = target.data("data").containing_list_view;
			else if(target.data("list"))
				target_container = target.data("list");

			var promise = new Promise(function(resolve, reject){
				target_container.drop_in_container(window.transfer_data, target, resolve, reject);
			});
			promise.then(function(data){
				addDragDrop(data.list1);
				addDragDrop(data.list2);
			})
			.catch(function(error){
				console.log("Error with asychronous call", error);
        		console.trace();
			});
		},

	    // set $item relative to cursor position*/
		onDragStart: function ($item, container, _super) {
			window.transfer_data = $item.data("data");
			$item.css({
				"position" : "absolute",
				"z-index" : "999999999999",
				"opacity" : "0.7",
				"padding-left" : "5px"
			});
			$item.find("input").css("display", "none");
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
			// if(this.targetIsTopic()){
			// 	var targetCheck = target;
			// 	$(".placeholder").css("display", "none");
			// 	if(!target.hasClass("under_topic")){
			// 		$(".under_topic").removeClass("under_topic");
			// 		$(".above_topic").css("display", "none");
			// 		$(".below_topic").css("display", "none");
			// 		target.addClass("under_topic");
			// 		target.find(".above_topic, .below_topic").css({
			// 			"display" : "block",
			// 			"background-color" : "#EEEEEE"
			// 		});
			// 	}

			// 	if(this.checkInRange(target)){
			// 		var self = this;
			// 		setTimeout(function(){
			// 			if(self.checkInRange(targetCheck)){
			// 				console.log(targetCheck.data("data"));
			// 				if(!targetCheck.data("data").$el.hasClass("current_topic")){
			// 					targetCheck.data("data").open_folder(event);
			// 				}
			// 			}
			// 		}, this.openTopicInterval);
			// 	}else{
			// 		isaboveclosest = this.currentEvent.pageY < this.getBoundingBox(target).yMin;
			// 		$(".above_topic").css("background-color", (isaboveclosest)? "#BDBDBD" : "#EEEEEE");
			// 		$(".below_topic").css("background-color", (!isaboveclosest)? "#BDBDBD" : "#EEEEEE");
			// 	}
			// }else{
			// 	$(".placeholder").css("display", "block");
			// 	$(".above_topic").css("display", "none");
			// 	$(".below_topic").css("display", "none");
			// }

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