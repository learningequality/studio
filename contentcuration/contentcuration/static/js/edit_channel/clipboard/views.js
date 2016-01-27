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
		DragHelper.handleDrop(this, "move"); //TODO: Debug!
	},
	render: function() {
		this.$el.html(this.template({
			collapsed : this.collapsed,
			content_list : this.collection.toJSON()
		}));
		this.$el.find(".badge").html(this.collection.length);
		this.load_content();

		this.$el.data("container", this);
		
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
		console.log("adding to clipboard");
		var collection = this.collection;
		models.forEach(function(entry){
			collection.add(entry);
		});
	},

	add_to_container: function(transfer){
		var copy = this.collection.duplicate(transfer.data.model);
		console.log("copy is",copy);
		this.add_to_clipboard([copy]);
	}
});

/* Loaded when user clicks clipboard button below navigation bar */
var ClipboardItem = BaseViews.BaseListItemView.extend({
	template: require("./hbtemplates/clipboard_list_item.handlebars"),

	initialize: function(options) {
		this.containing_list_view = options.containing_list_view;
		this.allow_edit = false;
		_.bindAll(this, 'remove_item', 'edit_item', 'submit_item');
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
		'click .delete_content' : 'remove_item',
		'click .edit_content' : 'edit_item',
		'click .submit_content' : "submit_item",
		'keydown .clipboard_title_input' : "submit_item",
		'dblclick label' : 'edit_item'
	},
	edit_item: function(){
		this.allow_edit = true;
		this.render();
	},
	remove_item: function(){
		if(confirm("Are you sure you want to delete " + this.model.attributes.title +"?"))
			this.delete(true);
	},
	submit_item:function(event){
		if(!event.keyCode || event.keyCode ==13){
			this.save({title: this.$el.find(".clipboard_title_input").val()});	
		}
		
	}
});



/*TODO: Add in ClipboardDeletedItemView*/

module.exports = {
	ClipboardList:ClipboardList
}