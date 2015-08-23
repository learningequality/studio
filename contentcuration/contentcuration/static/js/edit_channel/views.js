var Backbone = require("backbone");
var _ = require("underscore");

/* Depending on implementation, might create one view for each page to keep data from resetting 
var EditViews = require("edit_channel/tree_edit/views");
var PreviewViews = require("edit_channel/tree_preview/views");
var TrashViews = require("edit_channel/trash/views");
*/
var BaseView = Backbone.View.extend({
	template: require("./hbtemplates/channel_edit.handlebars"),
	initialize: function() {
		_.bindAll(this, 'open_edit', 'open_preview', 'open_trash', 'open_publish');
		this.render();
	},
	render: function() {
		this.$el.html(this.template(this.model));
	},
	events: {
		'click #channel-edit-button': 'open_edit',
		'click #channel-preview-button': 'open_preview',
		'click #channel-trash-button':'open_trash',
		'click #channel-publish-button': 'open_publish'
	},
	
	open_edit: function(){
		var EditViews = require("edit_channel/tree_edit/views");
		new EditViews.TreeEditView({
			el: $("#main-content-area"),
			model: this.model,
			edit: true
		});
	},
	
	open_preview: function(){
		var PreviewViews = require("edit_channel/tree_preview/views");
		new PreviewViews.TreePreviewView({
			el: $("#main-content-area"),
			model: this.model,
			edit: false
		});
	},

	open_trash: function(){
		var TrashViews = require("edit_channel/trash/views");
		new TrashViews.TrashView({
			el: $("#main-content-area"),
			model: this.model
		});
	},

	//Todo: Change to actually publish the channel (i.e. add to published tree)
	open_publish: function(){
		if(confirm("Are you sure you want to publish?")){
			console.log("Publishing Channel");
		}
	}
});

module.exports = {
	BaseView: BaseView
}