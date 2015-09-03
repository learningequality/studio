var Backbone = require("backbone");
var _ = require("underscore");
require("trash.less");

var LoadHelper = require("edit_channel/utils/LoadHelper");
var DOMHelper = require("edit_channel/utils/DOMHelper");
var PreviewerViews = require("edit_channel/previewer/views");

/* Todo: figure out how to display archived files after deleted */
var TrashView = Backbone.View.extend({
	template: require("./hbtemplates/trash.handlebars"),
	initialize: function() {
		_.bindAll(this, 'delete_selected', 'restore_selected','select_all','toggle_file_item','preview_list_item','check_item','toggle_folder_item');
		//this.listenTo(this.model, "change:number_of_hexagons", this.render);
		this.render();
	},
	render: function() {
		this.$el.html(this.template(this.model));
		var folder_template = require("./hbtemplates/trash_collapsed.handlebars");
		var file_template = require("./hbtemplates/trash_collapsed.handlebars");
		$(".trash_list_container ul").empty();
		var index = LoadHelper.loadList(this.model.topic.root_node, model, folder_template, file_template, ".trash_list_container ul", 50, null, 0, 0);
		if(index == 0) $("#trash_list").append("<h5 class=\"default-item\">No content found.</h5>");
	},
	
	events: {
		'click #delete-selected-button': 'delete_selected',
		'click #restore-selected-button': 'restore_selected',
		'click #select_all': 'select_all',
		'click .tog_file': 'toggle_file_item',
		'click .tog_folder': 'toggle_folder_item',
		'click .prev': 'preview_list_item',
		'change #trash [type=checkbox]' : 'check_item'
	},
	delete_selected: function(event){
		if(confirm("Are you sure you want to delete the selected files?")){
			console.log("Deleting Selected... ");
			var selected = $('.trash_list_container').find('input:checked + label');
			for(var i = 0; i < selected.length; i++){
				selected[i].parentNode.remove();
			}
		}
	},
	restore_selected: function(event){
		console.log("Restoring Selected... ");
		var selected = $('.trash_list_container').find('input:checked + label');
		for(var i = 0; i < selected.length; i++){
			selected[i].parentNode.remove();
		}
	},
	
	select_all: function(event){
		if(event.target.checked){
			$(".select_all_span .sidebar").css("display", "inline-block");
			$(".select_all_span").css("background-color", "#E6E6E6");
		}
		else {
			$(".select_all_span .sidebar").css("display", "none");
			$(".select_all_span").css("background-color", "transparent");
		}
		var selected = $('.trash_list_container').find('input[type=checkbox]');
		for(var i = 0; i < selected.length; i++){
			selected[i].checked = event.target.checked;
			checkItem("#" + selected[i].parentNode.id, event.target.checked);
		}
	},
	toggle_folder_item: function(event){
		event.preventDefault();
		var el = "#" + DOMHelper.getParentOfTag(event.target, "li").id;
		if($(el).data("collapsed")){
			$(el + "_sub").slideDown();
			$(el).data("collapsed", false);
		}
		else{
			$(el + "_sub").slideUp();
			$(el).data("collapsed", true);
		}
	},
	toggle_file_item: function(event){
		event.preventDefault();

		var el = "#" + DOMHelper.getParentOfTag(event.target, "li").id;
		if($(el).data("collapsed")){
			$(el).data("collapsed", false);
			var details_template = require("./hbtemplates/trash_expanded.handlebars");
			$(el+" label").append(details_template({file: $(el).data("data").attributes}));
			$(el+" .glyphicon-chevron-right").attr("class", "tog glyphicon glyphicon-chevron-down");
			var textHelper = require("edit_channel/utils/TextHelper");
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
			$(el+" .glyphicon-chevron-down").attr("class", "tog glyphicon glyphicon-chevron-right");
			$(el+" .details").remove();
			$(el + " .detail-bar").css("display", "none");
			$(el + " .prev").css("color", "black");
			$(el + " .details").slideToggle(500);
			$(el + " .sidebar").css("height", $(el).height());
		}
	},
	preview_list_item: function(event){
		event.preventDefault();
		var file = $("#"+ DOMHelper.getParentOfTag(event.target, "li").id);
		var view = new PreviewerViews.PreviewerView({
			el: $("#previewer-area"),
			model: file.data("data").attributes,
			file: file
		});
		var addon_template = require("./hbtemplates/trash_preview_add_on.handlebars");
		$("#previewer").append(addon_template());
	},
	check_item: function(event){
		if(event.target.parentNode.nodeName != "DIV")
			checkItem("#" + event.target.parentNode.id, event.target.checked);
	}
});

function checkItem(el, checked){
	if(checked){
		$(el + " .sidebar").css("height", $(el).height());
		$(el + " .sidebar").css("display", "inline-block");
		$(el + " .detail-bar").css("display", "none");
		$(el).css("background-color", "#E6E6E6");
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

module.exports = {
	TrashView: TrashView
}