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
		var listHelper = require("edit_channel/utils/loadList");
		var folder_template = require("./hbtemplates/trash_collapsed.handlebars");
		var file_template = require("./hbtemplates/trash_collapsed.handlebars");
		var index = listHelper.loadList(this.model.topicnodes, this.model.contentnodes, folder_template, file_template, ".trash_list_container ul");
		if(index == 0) $("#trash_list").append("<h5 class=\"default-item\">No content found.</h5>");
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
		if(confirm("Are you sure you want to delete the selected files?")){
			console.log("Deleting Selected... ");
			var selected = $('#trash_list').find('input:checked + label');
			for(var i = 0; i < selected.length; i++){
				selected[i].parentNode.remove();
			}
		}
	},
	restore_selected: function(event){
		console.log("Restoring Selected... ");
		var selected = $('#trash_list').find('input:checked + label');
		for(var i = 0; i < selected.length; i++){
			selected[i].parentNode.remove();
		}
	},
	
	/* Todo: Fix this so that it doesn't trigger change event (problem with event.target) */
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
			$(el+" h4 span").attr("class", "tog glyphicon glyphicon-chevron-down");
			var textHelper = require("edit_channel/utils/trimText");
			$(el + " #bottom-right p").html(textHelper.trimText($(el + " #bottom-right p").text(), "... read more", 100, true));

			if($(el+" input[type=checkbox]").prop("checked") == false){
				$(el + " .detail-bar").css("height", $(el).height());
				$(el + " .detail-bar").css("display", "inline");
				$(el + " .prev").css("color", "white");
			}
			else{
				$(el + " .sidebar").css("height", $(el).height());
				$(el + " .prev").css("color", "black");
			}
		}
		else{
			$(el).data("collapsed", true);
			$(el+" h4 span").attr("class", "tog glyphicon glyphicon-chevron-right");
			$(el+" .details").remove();
			$(el + " .detail-bar").css("display", "none");
			$(el + " .prev").css("color", "black");
			$(el + " .details").slideToggle(500);
			$(el + " .sidebar").css("height", $(el).height());
		}
	},
	preview_list_item: function(event){
		event.preventDefault();
		var previewHelper = require("edit_channel/utils/loadPreview");
		previewHelper.loadPreview($("#"+event.target.parentNode.parentNode.id).data("data"));
		var addon_template = require("./hbtemplates/trash_preview_add_on.handlebars");
		$("#previewer").append(addon_template());
	},
	check_item: function(event){
		var el = "#" + event.target.parentNode.id;
		if(event.target.checked){
			$(el + " .sidebar").css("height", $(el).height());
			$(el + " .sidebar").css("display", "inline-block");
			$(el + " .detail-bar").css("display", "none");
			$(el).css("background-color", "#E1F0DE");
			$(el + " .prev").css("color", "black");
		}
		else {
			$(el + " .sidebar").css("display", "none");
			$(el).css("background-color", "transparent");
			if(!$(el).data("collapsed")){
				$(el + " .detail-bar").css("height", $(el).height());
				$(el + " .detail-bar").css("display", "inline");
				$(el + " .prev").css("color", "white");
			}
		}
	}
});

module.exports = {
	TrashView: TrashView
}