var Backbone = require("backbone");
var _ = require("underscore");
require("trash.less");

/* Todo: figure out how to display archived files after deleted */

var TrashView = Backbone.View.extend({
	template: require("./hbtemplates/trash.handlebars"),
	initialize: function() {
		_.bindAll(this, 'delete_selected', 'restore_selected','select_all','toggle_list_item','preview_list_item','check_item');
		//this.listenTo(this.model, "change:number_of_hexagons", this.render);
		this.render();
	},
	render: function() {
		this.$el.html(this.template(this.model));
		loadFiles(this.model.topicnodes, this.model.contentnodes);
	},
	
	events: {
		'click #delete-selected-button': 'delete_selected',
		'click #restore-selected-button': 'restore_selected',
		'click #select_all': 'select_all',
		'click .tog': 'toggle_list_item',
		'click .prev': 'preview_list_item',
		'change #trash [type=checkbox]' : 'check_item'
	},
	delete_selected: function(event){
		if(confirm("Are you sure you want to delete the selected files?"))
		{
			console.log("Deleting Selected... ");
			var selected = $('#trash_list').find('input:checked + label');
			for(var i = 0; i < selected.length; i++){
				console.log($("#"+selected[i].parentNode.id).data("data").attributes);
				selected[i].parentNode.remove();
			}
		}
	},
	restore_selected: function(event){
		console.log("Restoring Selected... ");
		var selected = $('#trash_list').find('input:checked + label');
		for(var i = 0; i < selected.length; i++){
			console.log($("#"+selected[i].parentNode.id).data("data").attributes);
			selected[i].parentNode.remove();
		}
	},
	select_all: function(event){
		var selected = $('#trash_list').find('input[type=checkbox]');
		for(var i = 0; i < selected.length; i++){
			selected[i].checked = event.target.checked;
			event.stopImmediatePropagation();
		}
	},
	toggle_list_item: function(event){
		event.preventDefault();
		var el = "#" + event.target.parentNode.parentNode.parentNode.id;
		if($(el).data("collapsed")){
			$(el).data("collapsed", false);
			var details_template = require("./hbtemplates/trash_expanded.handlebars");
			$(el+" label").append(details_template({file: $(el).data("data").attributes}));
			$(el+" label a").html("v");
			var p = $(el + " #bottom-right p").text();
			if(p.trim().length > 100)
			{
				$(el + " #bottom-right p").text(p.substring(0, 87));
				$(el + " #bottom-right p").append("<a title=\""+ p + "\">... read more</a>");
			}

			if($(el+" input[type=checkbox]").prop("checked") == false){
				$(el + " .detail-bar").css("height", $(el).height());
				$(el + " .detail-bar").css("display", "inline");
			}
			else
				$(el + " .sidebar").css("height", $(el).height());
		}
		else{
			$(el).data("collapsed", true);
			$(el+" label a").html(">");
			$(el+" table").remove();
			$(el + " .detail-bar").css("display", "none");
			$(el + " table").slideToggle(500);
			$(el + " .sidebar").css("height", $(el).height());
		}
	},
	preview_list_item: function(event){
		event.preventDefault();
		var data = $("#"+event.target.parentNode.parentNode.id).data("data");
		var topic_list = [];
		var add = data;
		for(var i = 0; i < 3; i++)
		{
			if(add.attributes.parent)
			{
				add = add.attributes.parent;
				topic_list.unshift(add);
			}
		}
		var PreviewerViews = require("edit_channel/previewer/views");
		var view = new PreviewerViews.PreviewerView({
				el: $("#previewer-area"),
				model: {file: data.attributes, parent: topic_list}
			});
		var addon_template = require("./hbtemplates/trash_preview_add_on.handlebars");
		$("#previewer").append(addon_template());
	},
	check_item: function(event){
		console.log(event.target);
		var el = "#" + event.target.parentNode.id;
		if(event.target.checked){
			$(el + " .sidebar").css("height", $(el).height());
			$(el + " .sidebar").css("display", "inline-block");
			$(el + " .detail-bar").css("display", "none");
			$(el).css("background-color", "#E1F0DE");
		}
		else {
			$(el + " .sidebar").css("display", "none");
			$(el).css("background-color", "transparent");
			if(!$(el).data("collapsed")){
				$(el + " .detail-bar").css("height", $(el).height());
				$(el + " .detail-bar").css("display", "inline");
			}
		}
	}
});

function loadFiles(topic_nodes, content_nodes){	
	var list_index = 0;
	
	//Retreive all topic nodes that are a child of parent
	topic_nodes.forEach(function(entry)
	{
		var folder_template = require("./hbtemplates/trash_collapsed.handlebars");
		$(".trash_list_container ul").append(folder_template({index: list_index, file: entry.attributes}));
		$("#item_"+list_index).data("data",entry);
		$("#item_"+list_index).data("collapsed", true);
		list_index ++;
	});
	
	//Retreive all content nodes that are a child of parent
	content_nodes.forEach(function(entry)
	{
		var file_template = require("./hbtemplates/trash_collapsed.handlebars");
		$(".trash_list_container ul").append(file_template({index: list_index, file: entry.attributes}));
		$("#item_"+list_index).data("data", entry);
		$("#item_"+list_index).data("collapsed", true);
		list_index ++;
	});

	//Default text to display if no items are in trash
	if(list_index ==0)
		$("#trash_list").append("<h5 class=\"default-item\">No content found.</h5>");
}

module.exports = {
	TrashView: TrashView
}