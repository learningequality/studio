var Backbone = require("backbone");
var _ = require("underscore");
var LoadHelper = require("edit_channel/utils/LoadHelper");
var DOMHelper = require("edit_channel/utils/DOMHelper");
var TextHelper = require("edit_channel/utils/TextHelper");
var PreviewerViews = require("edit_channel/previewer/views");

require("preview.less");
var container_number; // Better to find other way to identify unique container

var TreePreviewView = Backbone.View.extend({
	template: require("./../hbtemplates/container_area.handlebars"),

	initialize: function(options) {
		_.bindAll(this, 'open_folder', 'preview_file','expand_folder','minimize_folder');
		//this.listenTo(this.model, "change:number_of_topics", this.render);
		this.edit = options.edit;
		this.render();
	},
	render: function() {
		this.$el.html(this.template({edit: this.edit}));
		container_number = 0;
		container_number = LoadHelper.loadContainer(null, this.model.topic.get("root_node"), this.model.topicnodes, 
												this.model.contentnodes, container_number, this.edit, true, 0); 
	},
	events: {
		'click .folder': 'open_folder',
		'click .file': 'preview_file',
		'click .filler': 'expand_folder',
		'click .minimize':'minimize_folder'
	},
	expand_folder: function(event){
		TextHelper.manageFolder(event, true);
	},
	minimize_folder: function(event){
		TextHelper.manageFolder(event, false);
	},
	open_folder: function(event){
		var el = DOMHelper.getParentOfTag(event.target, "label");
		container_number = LoadHelper.loadContainer(el, $("#"+el.parentNode.id).data("data"), this.model.topicnodes, 
												this.model.contentnodes, container_number, this.edit, false);
	},
	preview_file: function(event){
		var file = $("#"+ DOMHelper.getParentOfTag(event.target, "li").id);
		var view = new PreviewerViews.PreviewerView({
			el: $("#previewer-area"),
			model: file.data("data"),
			file: file
		});
	}
});

module.exports = {
	TreePreviewView: TreePreviewView
}