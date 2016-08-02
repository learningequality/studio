var Models = require("edit_channel/models");

/* handleDrop: adds dropping ability to a certain container
*	Parameters:
*		container: container to add dropping ability to
*/
function addSortable(element, selected_class, callback){
	var oldContainer;
	var item_height = 0;
	var target;
	var isaboveclosest;
	var selectedClass = selected_class;
	var yPosition = 0;

	element.$el.find(".content-list").sortable({
	    revert:100,
	    helper : 'clone',
		placeholder: "sorting-placeholder",
		forcePlaceholderSize: true,
		scroll:true,
	   	scrollSpeed: 10,
	   	connectWith: '.content-list',
	   	tolerance: "pointer",
	   	delay:100,
	   	distance:20,
	   	cursor:"move",
	   	zIndex:999999999999,
	   	cancel: '.current_topic, .default-item, #preview li',
	   	bodyClass: "dragging",
	    helper: function (e, item) {
            if(!item.hasClass(selectedClass))
               item.addClass(selectedClass);
            var elements = $('.' + selectedClass).not('.sorting-placeholder').not('.current_topic').clone();
            var helper = $('<ul class="list-unstyled ui-sorting-list" id="drag-list"/>');
            item.siblings('.'+ selectedClass).not('.current_topic').addClass('hidden');
            return helper.append(elements);
        },
        start: function (e, ui) {
            var elements = $('.' + selectedClass + '.hidden').not('.current_topic').not('.sorting-placeholder');
            ui.item.data('items', elements);
        },
        receive: function (e, ui) {
            ui.item.before(ui.item.data('items'));
        },
        stop: function (e, ui) {
            ui.item.siblings('.' + selectedClass).removeClass('hidden');
            $("." + selectedClass + " input[type='checkbox']").prop("checked", false);
            $('.' + selectedClass).removeClass(selectedClass);
        },
		update: function(event, ui) {
			if($(ui.item.context).data("data")){
				// $(".content-list").sortable("disable");
				var order = new Models.ContentNodeCollection();
				var selected_items = new Models.ContentNodeCollection();
				var current_node = $(ui.item.context).data("data").model;
		        element.$el.find("li").each( function(e) {
		        	if($(this).attr('id') && !$(this).attr('id').includes("default_item")){
		        		var node = $(this).data("data").model;
		        		order.push(node);
		        	}
		       	});

		        var appended_items = new Models.ContentNodeCollection(); //Items from another container
		        ui.item.data('items').each(function(e){
		        	if($(this).data("data")){
		        		var node = $(this).data("data").model;
			        	if(!selected_items.contains(current_node) && current_node.get("parent") == node.get("parent") && current_node.get("sort_order") < node.get("sort_order")){
			        		selected_items.push(current_node);
			        	}
			        	(current_node.get("parent") === node.get("parent")) ? selected_items.push(node) : appended_items.push(node);
		        	}
		        });

		        if(!selected_items.contains(current_node)){
	        		selected_items.push(current_node);
	        	}

	        	selected_items.add(appended_items.models, {at: selected_items.length});
				var promise = new Promise(function(resolve2, reject2){
			        callback(current_node, selected_items, order, resolve2, reject2);
				});
				promise.then(function(){
					$(".content-list").sortable( "enable" );
				}).catch(function(error){
					console.log(error);
					$(".content-list").sortable( "enable" );
				});
			}
	    },
	    over: function (e, ui) {
		  $(ui.sender).sortable('instance').scrollParent = $(e.target)
		}
	}).droppable({
		items : 'li',
		revert: "valid",
		revertDuration:100,
		cursor:"move",
		cancel: '.current_topic, .default-item, #preview li'
	}).disableSelection();
}

function addTopicDragDrop(element, hoverCallback, dropCallback){
	var hoverInterval = 2000;
	var hoverOnItem = null;
	element.$el.droppable({
		items : 'li',
		revert: false,
		revertDuration:0,
		cursor:"move",
		hoverClass: "drop-topic-hover",
		drop:function(event, ui){
			if($(".sorting-placeholder").css('display') === "none"){
				$(".content-list").sortable("disable");
				var selected_items = new Models.ContentNodeCollection();
				var current_node = $(ui.draggable.context).data("data").model;

		        var appended_items = new Models.ContentNodeCollection(); //Items from another container
		        $("#drag-list li").each(function(index, item){
		        	if($(".content-list #"  + item.id).data("data")){
		        		var node = $(".content-list #"  + item.id).data("data").model;
			        	if(!selected_items.contains(current_node) && current_node.get("parent") == node.get("parent") && current_node.get("sort_order") < node.get("sort_order")){
			        		selected_items.push(current_node);
			        	}
			        	(current_node.get("parent") === node.get("parent")) ? selected_items.push(node) : appended_items.push(node);
			        	$(".content-list #"  + item.id).remove();
		        	}
		        })

		        if(!selected_items.contains(current_node)){
	        		selected_items.push(current_node);
	        	}
	        	selected_items.add(appended_items.models, {at: selected_items.length});
	        	dropCallback(selected_items, function(){
	        		$(ui.draggable.context).remove();
	        		$(".content-list").sortable( "enable" );
	        	});
			}
		},
		out: function(event, ui){
			$(".sorting-placeholder").css("display", "block");
			hoverOnItem = null;
		},
		over: function(event, ui){
			hoverOnItem = $(this)[0];
			if(!$(hoverOnItem).find("#menu_toggle_" + hoverOnItem.id).hasClass("glyphicon-menu-down")){
				var self = this;
				$(".sorting-placeholder").css("display", "none");
				var hoverItem = $(this)[0];
				setTimeout(function(){
					if(hoverOnItem === hoverItem && $(ui.draggable.context).data("data")){
						hoverCallback(event);
					}
				}, hoverInterval)
			}

		},
	});
}

function removeDragDrop(element){
	element.$el.removeClass("droppable_container");
	// element.$el.find("ul.content-list").sortable("destroy");
}

module.exports = {
	addSortable : addSortable,
	removeDragDrop : removeDragDrop,
	addTopicDragDrop:addTopicDragDrop
}