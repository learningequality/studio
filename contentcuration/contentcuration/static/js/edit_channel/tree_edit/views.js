var Backbone = require("backbone");
var _ = require("underscore");
require("content-container.less");
var BaseViews = require("./../views");
var BaseViews = require("./../views");
var ClipboardViews = require("edit_channel/clipboard/views");
var PreviewerViews = require("edit_channel/previewer/views");


var TreeEditView = BaseListView.extend({
	container_count: 0,
	item_view: "Topic/ContentNode",

	template: require("./../hbtemplates/container_area.handlebars"),
	root: null,
	initialize: function(options) {
		this.root = options.root;
		this.allow_edit = options.edit;

		/*_.bindAll(this, 'copy_content','delete_content' , 'set_editing', 'add_container', 'render_edit_mode');
		
		console.log(this.channel);
				this.isEditing = false;
		*/


		this.render();
	},
	render: function() {
		this.$el.html(this.template({edit: this.edit}));
		this.add_container(this.root);
	},
	add_container: function(topic){
		var container_view = new ContainerView({
			topic: topic, 
			edit: this.allow_edit, 
			count: this.container_count++
		});
		$("#container_area").append(container_view.el);
		this.items.push(container_view);
		console.log("containers", this.items);
		this.render_edit_mode();
	}
});

var ContainerView = BaseViews.BaseListItemView.extend({

});

module.exports = {
	TreeEditView: TreeEditView
}