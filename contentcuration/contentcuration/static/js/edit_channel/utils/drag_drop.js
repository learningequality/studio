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
		placeholder: "sorting-placeholder",
		forcePlaceholderSize: true,
		scroll:true,
	   	scrollSpeed: 10,
	   	connectWith: '.content-list',
	   	tolerance: "pointer",
	   	delay:100,
	   	distance:5,
	   	cursor:"move",
	   	cancel: '.current_topic, .default-item, #preview li',
	   	containment: "#channel-edit-sortable-boundary, #queue.opened",
	   	appendTo: "#channel-edit-content-wrapper",
	   	bodyClass: "dragging",
	   	// helper:"clone",
	    helper: function (e, item) {
            if(!item.hasClass(selectedClass))
               item.addClass(selectedClass);
            var elements = $('.' + selectedClass).not('.current_topic').clone();
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
        beforeStop: function(event, ui) {
            if ($(event.target).parent("#queue_content") && $("#queue").hasClass("closed")) {
                // $(this).sortable('cancel');
                 ui.item.siblings('.' + selectedClass).removeClass('hidden');
	            $("." + selectedClass + " input[type='checkbox']").prop("checked", false);
	            $('.' + selectedClass).removeClass(selectedClass);
            }
        },
		update: function(event, ui) {
			if($(".drop-topic-hover").length === 0){
				var view = window.workspace_manager.get(ui.item.context.id);
				if(view){
					var order = [];
					var selected_items = new Models.ContentNodeCollection();
					var current_node = view.node.model;
					$(".content-list").sortable( "disable" );
			        element.$el.find(".queue-list-wrapper >.content-list >li, >.content-list >li").each( function(e, list_item) {
			        	if($(list_item).attr('id') && !$(list_item).attr('id').includes("default_item")){
			        		var node = window.workspace_manager.get($(list_item).attr('id')).node.model;
			        		order.push(node);
			        	}
			       	});
			        var appended_items = new Models.ContentNodeCollection(); //Items from another container
			        if(ui.item.data('items')){
			        	ui.item.data('items').each(function(e){
				        	var view = window.workspace_manager.get(this.id);
				        	if(view){
				        		var node = view.node.model;
					        	if(!selected_items.contains(current_node) && current_node.get("parent") == node.get("parent") && current_node.get("sort_order") < node.get("sort_order")){
					        		selected_items.push(current_node);
					        	}
					        	(current_node.get("parent") === node.get("parent")) ? selected_items.push(node) : appended_items.push(node);
				        	}
				        });
			        }

			        if(!selected_items.contains(current_node)){
		        		selected_items.push(current_node);
		        	}

		        	selected_items.add(appended_items.models, {at: selected_items.length});
		        	callback(current_node, selected_items, order).then(function(){
						$(".content-list").sortable( "enable" );
						$(".content-list").sortable( "refresh" );
		        	});
				}

			}
	    },
	    over: function (e, ui) {
		  // $(ui.sender).sortable('instance').scrollParent = $(e.target)
		}
	}).droppable({
		items : 'li',
		cancel: '.current_topic, .default-item, #preview, #queue',
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
			if($(event.target).find(".drop-topic-hover").length === 0){
				if($(".sorting-placeholder").css('display') === "none"){
					var selected_items = new Models.ContentNodeCollection();
					var current_view = window.workspace_manager.get(ui.draggable.context.id);
					var current_node = current_view.node.model;
					hoverOnItem = null;
					$(".content-list").sortable( "disable" );

			        var appended_items = new Models.ContentNodeCollection(); //Items from another container
			        $("#drag-list li").each(function(index, item){
			        	var view = window.workspace_manager.get(item.id);
			        	if(view){
			        		var node = view.node.model;
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
		        	dropCallback(selected_items).then(function(){
		        		$(ui.draggable.context).remove();
		        		$(".content-list").sortable( "enable" );
		        		$(".content-list").sortable( "refresh" );
		        	});
				}
			}
		},
		out: function(event, ui){
			$(".sorting-placeholder").css("display", "block");
			hoverOnItem = null;
		},
		over: function(event, ui){
			hoverOnItem = $(this)[0];
			if(!$(hoverOnItem).find("#menu_toggle_" + hoverOnItem.id).hasClass("glyphicon-menu-down")){
				$(".sorting-placeholder").css("display", "none");
				var hoverItem = $(this)[0];
				setTimeout(function(){
					if(hoverOnItem === hoverItem && window.workspace_manager.get(ui.draggable.context.id).node){
						hoverCallback(event);
					}
				}, hoverInterval);
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