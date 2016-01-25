var Backbone = require("backbone");
var _ = require("underscore");
require("clipboard.less");
var BaseViews = require("./../views");
var Models = require("./../models");
var DragHelper = require("edit_channel/utils/drag_drop");

var PreviewerViews = require("edit_channel/previewer/views");

/* Loaded when user clicks clipboard button below navigation bar */
var ClipboardList = BaseViews.BaseListView.extend({
	template: require("./hbtemplates/clipboard_list.handlebars"),
	item_view:"clipboard",
	initialize: function(options) {
		_.bindAll(this, 'toggle_clipboard');
		this.collection = new Models.NodeCollection();
		this.collapsed = true;
		this.listenTo(this.collection, "sync", this.render);
        this.listenTo(this.collection, "remove", this.render);
		this.render();
	},
	render: function() {
		this.$el.html(this.template({
			collapsed : this.collapsed,
			content_list : this.collection.toJSON()
		}));
		this.$el.find(".badge").html(this.collection.length);
		this.load_content();

		this.$el.data("container", this);
		DragHelper.handleDrop(this, "move"); //TODO: Debug!
	},
	events: {
		'click .clipboard-toggler' : 'toggle_clipboard'
	},
	toggle_clipboard: function(){
		this.collapsed = !this.collapsed;
		if(this.collapsed) $("#clipboard").slideUp();
		this.render();
		if(!this.collapsed) $("#clipboard").slideDown();
	},
	load_content:function(){
		var containing_list_view = this;
		this.collection.forEach(function(entry){
			var clipboard_item_view = new ClipboardItem({
				containing_list_view: containing_list_view,
				el: containing_list_view.$el.find("#clipboard_item_" + entry.cid),
				model: entry
			});
			containing_list_view.views.push(clipboard_item_view);
		});
	},
	add_to_clipboard:function(models){
		var collection = this.collection;
		models.forEach(function(entry){
			collection.add(entry);
		});
	},

	add_to_container: function(transfer){
		var copy = this.collection.duplicate(transfer.data.model);
		this.add_to_clipboard([copy]);
	}
});

/* Loaded when user clicks clipboard button below navigation bar */
var ClipboardItem = BaseViews.BaseListItemView.extend({
	template: require("./hbtemplates/clipboard_list_item.handlebars"),

	initialize: function(options) {
		//_.bindAll(this);
		//this.listenTo(clipboard_list_items, "change:clipboard_list_items.length", this.render);
		this.containing_list_view = options.containing_list_view;
		this.allow_edit = false;
		this.render();
		$("#clipboard").slideDown();
	},
	render: function() {
		this.$el.html(this.template({
			node:this.model,
			isfolder: this.model.attributes.kind.toLowerCase() == "topic",
			allow_edit: this.allow_edit
		}));
		this.$el.data("data", this);
		DragHelper.handleDrag(this, "move");
	},
	events: {
		'click .clipboard-toggler' : 'toggle_clipboard'
	},
	edit_item: function(){
		this.allow_edit = true;
		this.render();
	},
	remove_item: function(){
		this.delete();
	},
});



/*TODO: Add in ClipboardDeletedItemView*/

module.exports = {
	ClipboardList:ClipboardList
}