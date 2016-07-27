var Models = require("edit_channel/models");

/* handleDrop: adds dropping ability to a certain container
*	Parameters:
*		container: container to add dropping ability to
*/
function addSortable(element, callback){
	var oldContainer;
	var item_height = 0;
	var target;
	var isaboveclosest;
	var selectedClass = 'content-selected';

	element.$el.find(".content-list").sortable({
	    revert:100,
	    helper : 'clone',
		placeholder: "sorting-placeholder",
		forcePlaceholderSize: true,
		scroll:true,
	   	scrollSensitivity: 100,
	   	scrollSpeed: 10,
	   	connectWith: '.content-list',
	   	tolerance: "pointer",
	   	delay:100,
	   	cursor:"move",
	   	cancel: '.current_topic, .default-item, #preview li',
	    helper: function (e, item) {
            if(!item.hasClass('content-selected'))
               item.addClass('content-selected');
            var elements = $('.content-selected').not('.sorting-placeholder').not('.current_topic').clone();
            var helper = $('<ul class="list-unstyled" id="drag-list"/>');
            item.siblings('.content-selected').not('.current_topic').addClass('hidden');
            return helper.append(elements);
        },
        start: function (e, ui) {
            var elements = $('.content-selected.hidden').not('.current_topic').not('.sorting-placeholder');
            ui.item.data('items', elements);
        },
        receive: function (e, ui) {
            ui.item.before(ui.item.data('items'));
        },
        stop: function (e, ui) {
            ui.item.siblings('.content-selected').removeClass('hidden');
            $(".content-selected input[type='checkbox']").prop("checked", false);
            $('.content-selected').removeClass('content-selected');

        },
		update: function(event, ui) {
			$(".content-list").sortable("disable");
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
			var promise = new Promise(function(resolve, reject){
		        callback(selected_items, order, resolve, reject);
			});

			promise.then(function(){
				$(".content-list").sortable( "enable" );
			}).catch(function(error){
				alert(error);
				$(".content-list").sortable( "enable" );
			});

	    }
	}).droppable({
		items : 'li',
		revert: "valid",
		revertDuration:100,
		cursor:"move",
		cancel: '.current_topic, .default-item, #preview li',
  		drop: function(e, ui) {

        }
	}).disableSelection();
}

function removeDragDrop(element){
	element.$el.removeClass("droppable_container");
	// element.$el.find("ul.content-list").sortable("destroy");
}

module.exports = {
	addSortable : addSortable,
	removeDragDrop : removeDragDrop,
}