var Backbone = require("backbone");
var _ = require("underscore");
var LoadHelper = require("edit_channel/utils/loadTree");
require("preview.less");
var container_number; // Better to find other way to identify unique container

var TreePreviewView = Backbone.View.extend({
	template: require("./../hbtemplates/container_area.handlebars"),

	initialize: function(options) {
		_.bindAll(this, 'openFolder', 'previewFile');
		//this.listenTo(this.model, "change:number_of_topics", this.render);
		this.edit = options.edit;
		this.render();
	},
	render: function() {
		this.$el.html(this.template({edit: this.edit}));
		container_number = 0;
		container_number = LoadHelper.loadTree(null, this.model.topic.get("root_node"), this.model.topicnodes, 
												this.model.contentnodes, container_number, this.edit); 
	},
	events: {
		'click .folder': 'openFolder',
		'click .file': 'previewFile'
	},
	openFolder: function(event){
		var el = event.target.parentNode.parentNode;
		container_number = LoadHelper.loadTree(el, $("#"+el.id).data("data"), this.model.topicnodes, 
												this.model.contentnodes, container_number,this.edit);
	},
	previewFile: function(event){
		var previewHelper = require("edit_channel/utils/loadPreview");
		previewHelper.loadPreview($("#"+event.target.parentNode.parentNode.id).data("data"));
	}
});

module.exports = {
	TreePreviewView: TreePreviewView
}