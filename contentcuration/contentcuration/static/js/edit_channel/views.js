var Backbone = require("backbone");
var _ = require("underscore");

var clipboardContent = [];

window.BaseView = Backbone.View.extend({
	template: require("./hbtemplates/channel_edit.handlebars"),
	url: '/api',
	initialize: function() {
		this.render();
	},
	render: function() {
		this.$el.html(this.template(this.model));

		/* Defaults to channel manager view */
		$("#channel-selector").css("display", "none");
		$("#content-search").css("display", "none");
		
		var ChannelManageView = require("edit_channel/new_channel/views");
		new ChannelManageView.ManageChannelsView ({
			el: $("#channel-container"),
			model: this.model
		});
	}
});

window.EditView = Backbone.View.extend({
	template: require("./hbtemplates/channel_edit.handlebars"),
	url: '/api',
	initialize: function(options) {
		_.bindAll(this, 'open_edit', 'open_preview', 'open_trash', 'open_publish','open_clipboard');
		this.channel = options.channel;

		this.render();
	},
	render: function() {
		this.$el.html(this.template(this.model));
		$("#clipboard-toggler").show();
		$("#channel-selector").css("display", "inline-block");
		$("#content-search").css("display", "inline-block");
		$("#channel-dropdown").html(this.channel.title);
		$("#channel_select").empty();
		this.model.channels.forEach(function(entry){
				$("#channel_select").append("<li>" + entry.attributes.title + "</li>");
		});
		
		var EditViews = require("edit_channel/tree_edit/views");
		new EditViews.TreeEditView({
			el: $("#main-content-area"),
			model: this.model,
			edit: true
		});
	},
	events: {
		'click #channel-edit-button': 'open_edit',
		'click #channel-preview-button': 'open_preview',
		'click #channel-trash-button':'open_trash',
		'click #channel-publish-button': 'open_publish',
		'click #clipboard-toggler' : 'open_clipboard'
	},
	
	open_edit: function(){
		$("#clipboard-toggler").show();
		var EditViews = require("edit_channel/tree_edit/views");
		new EditViews.TreeEditView({
			el: $("#main-content-area"),
			model: this.model,
			edit: true
		});
	},
	
	open_preview: function(){
		$("#clipboard-toggler").hide();
		$("#clipboard").hide();
		var PreviewViews = require("edit_channel/tree_preview/views");
		new PreviewViews.TreePreviewView({
			el: $("#main-content-area"),
			model: this.model,
			edit: false
		});
	},

	open_trash: function(){
		$("#clipboard-toggler").show();
		var TrashViews = require("edit_channel/trash/views");
		new TrashViews.TrashView({
			el: $("#main-content-area"),
			model: this.model
		});
	},
	open_clipboard: function(){
		var ClipboardViews = require("edit_channel/clipboard/views");
		new ClipboardViews.ClipboardListView({
			el: $("#clipboard-area"),
			model: this.model
		});
	},

	//Todo: Change to actually publish the channel (i.e. add to published tree)
	open_publish: function(){
		if(confirm("Are you sure you want to publish?")){
			console.log("Publishing Channel");
			new BaseView({
				el: $("#channel-container"),
				model: this.model
			});
		}
	}
});

function addToClipboard(topic_nodes, content_nodes){
	//clipboardContent
}

module.exports = {
	BaseView: BaseView,
	EditView: EditView
}