var Backbone = require("backbone");
var _ = require("underscore");
require("trash.less");
var BaseViews = require("./../views");
var BaseViews = require("./../views");


/* Todo: figure out how to display archived files after deleted */
var TrashView = Backbone.View.extend({
	/* TODO: Move this to the clipboard 
	template: require("./hbtemplates/trash.handlebars"),
	initialize: function(options) {
		_.bindAll(this, 'delete_selected', 'restore_selected','select_all');
		//this.listenTo(this.model, "change:number_of_hexagons", this.render);
		this.render();
	},
	render: function() {
		this.$el.html(this.template(this.model));
		this.load_topics(this.topic, this.$el);
		this.load_content(this.topic, this.$el);
	},
	
	events: {
		'click #delete-selected-button': 'delete_selected',
		'click #restore-selected-button': 'restore_selected',
		'click #select_all': 'select_all'
	},
	delete_selected: function(event){
		if(confirm("Are you sure you want to delete the selected files?")){
			console.log("Deleting Selected... ");
			var selected = $('.trash_list_container').find('input:checked + label');
			for(var i = 0; i < selected.length; i++){
				$("#" + selected[i].parentNode.id + "_sub").remove();
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
	}
});

var TrashListItemView =  BaseViews.BaseListItemView.extend({
	template: require("./hbtemplates/trash_collapsed.handlebars"),
	initialize: function(options) {
		_.bindAll(this,'check_item','toggle_folder_item','toggle_file_item','preview_list_item');
		//this.listenTo(this.model, "change:number_of_hexagons", this.render);
		this.view_model = this.model;
		this.isFolder = options.isFolder;
		this.render();
	},
	render: function() {
		this.$el.html(this.template(this.model));
		var folder_template = require("./hbtemplates/trash_collapsed.handlebars");
		var file_template = require("./hbtemplates/trash_collapsed.handlebars");
		$(".trash_list_container ul").empty();
		//var index = LoadHelper.loadList(this.model.topic.root_node, this.view_model, folder_template, file_template, ".trash_list_container ul", 50, null, 0, 0);
		if(index == 0) $("#trash_list").append("<h5 class=\"default-item\">No content found.</h5>");
	},
	
	events: {
		'click .tog_folder': 'toggle_folder_item',
		'change #trash [type=checkbox]' : 'check_item',
		'click .tog_file': 'toggle_file_item',
		'click .prev': 'preview_list_item',
	},
	toggle_folder_item: function(event){
		event.preventDefault();
		var el = $(event.target).parent("li").id;
		if($(el).data("collapsed")){
			$(el + "_sub").slideDown();
			$(el+" .glyphicon-chevron-right").attr("class", "tog_folder glyphicon glyphicon-chevron-down");
			$(el).data("collapsed", false);
		}
		else{
			$(el + "_sub").slideUp();
			$(el).data("collapsed", true);
			$(el+" .glyphicon-chevron-down").attr("class", "tog_folder glyphicon glyphicon-chevron-right");
		}
	},
	check_item: function(event){
		if(event.target.parentNode.nodeName != "DIV")
			checkItem("#" + event.target.parentNode.id, event.target.checked);
	},
	toggle_file_item: function(event){
		event.preventDefault();
		var el = $(event.target).parent("li").id;
		if($(el).data("collapsed")){
			$(el).data("collapsed", false);
			$(el + " .trash_details").slideDown();
			$(el+" .glyphicon-chevron-right").attr("class", "tog_file glyphicon glyphicon-chevron-down");
			$(el).css("height", "300px");
			//var textHelper = require("edit_channel/utils/TextHelper");
			//$(el + " #bottom-right p").html(textHelper.trimText($(el + " #bottom-right p").text(), "...", 100, false));

			
			if($(el+" input[type=checkbox]").prop("checked") == false)
				$(el + " .detail-bar").css({"height" : $(el).height(), "display" : "inline"});
			else{
				$(el + " .sidebar").css("height", $(el).height());
				$(el + " .prev").css("color", "black");
			}
		}
		else{
			$(el).data("collapsed", true);
			$(el+" .glyphicon-chevron-down").attr("class", "tog_file glyphicon glyphicon-chevron-right");
			$(el + " .trash_details").slideUp();
			$(el + " .detail-bar").css("display", "none");
			$(el).css("height", "50px");
			$(el + " .sidebar").css("height", $(el).height());
		}
	},
	preview_list_item: function(event){
		event.preventDefault();
		//var file = $("#"+ DOMHelper.getParentOfTag(event.target, "li").id);
		var view = new PreviewerViews.PreviewerView({
			el: $("#previewer-area"),
			model: file.data("data"),
			file: file
		});
		var addon_template = require("./hbtemplates/trash_preview_add_on.handlebars");
		$("#previewer").append(addon_template());
	}
	*/
});

module.exports = {
	TrashView: TrashView
}
