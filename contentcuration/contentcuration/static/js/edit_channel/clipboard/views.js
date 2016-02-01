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
	root : null,
	initialize: function(options) {
		_.bindAll(this, 'toggle_clipboard');
		this.collapsed = true;
		this.topictrees = options.topictrees;
		this.root = this.topictrees.get({id : window.current_channel.clipboard}).get_root();
		this.collection = options.collection.get_all_fetch(this.root.get("children"));
		this.listenTo(this.collection, "sync", this.render);
        this.listenTo(this.collection, "remove", this.render);
		this.render();
		DragHelper.handleDrop(this, "move"); //TODO: Debug!
	},
	render: function() {
		console.log("rendering");
		this.$el.html(this.template({
			collapsed : this.collapsed,
			content_list : this.collection.toJSON()
		}));
		this.$el.find(".badge").html(this.collection.length);
		this.$el.data("container", this);
		this.load_content();
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
				el: containing_list_view.$el.find("#clipboard_item_" + entry.id),
				model: entry,
				indent : 0,
			});
			containing_list_view.views.push(clipboard_item_view);
		});
	},
	add_to_clipboard:function(models){
		var container = this;
		models.forEach(function(entry){
			container.collection.add(entry);
		});
	},

	add_to_container: function(transfer){
		var copy = transfer.data.model.duplicate(this.root.id);
		this.add_to_clipboard([copy]);
	}
});

/* Loaded when user clicks clipboard button below navigation bar */
var ClipboardItem = BaseViews.BaseListItemView.extend({
	template: require("./hbtemplates/clipboard_list_item.handlebars"),

	initialize: function(options) {
		this.containing_list_view = options.containing_list_view;
		this.allow_edit = false;
		this.indent = options.indent + 20;
		_.bindAll(this, 'remove_item', 'edit_item', 'submit_item', 'toggle_folder');
		this.render();
	},
	render: function() {
		this.$el.html(this.template({
			node:this.model,
			isfolder: this.model.get("kind").toLowerCase() == "topic",
			allow_edit: this.allow_edit,
			sub_list: this.model.get("children"),
			indent: this.indent,
		}));

		this.$el.data("data", this);
		DragHelper.handleDrag(this, "move");
		this.load_subfiles();
	},
	events: {
		'click .delete_content' : 'remove_item',
		'click .edit_content' : 'edit_item',
		'click .submit_content' : "submit_item",
		'keydown .clipboard_title_input' : "submit_item",
		'dblclick .clipboard_item_title' : 'edit_item',
		'click .tog_folder' : 'toggle_folder'
	},
	edit_item: function(){
		this.allow_edit = true;
		this.render();
	},
	remove_item: function(){
		if(confirm("Are you sure you want to delete " + this.model.get("title") +"?"))
			this.delete(true);
	},
	submit_item:function(event){
		if(!event.keyCode || event.keyCode ==13){
			this.save({title: this.$el.find(".clipboard_title_input").val()});	
		}
		
	},
	toggle_folder:function(event){
		event.stopPropagation();
		event.preventDefault();
		var el =  this.$el.find("#menu_toggle_" + this.model.id);
		if(el.hasClass("glyphicon-menu-up")){
			this.$el.find("#clipboard_item_"+this.model.id+"_sub").slideDown();
			el.removeClass("glyphicon-menu-up").addClass("glyphicon-menu-down");
		}else{
			this.$el.find("#clipboard_item_"+this.model.id+"_sub").slideUp();
			el.removeClass("glyphicon-menu-down").addClass("glyphicon-menu-up");
		}
	},
	load_subfiles:function(){
		var subfiles = new Models.NodeCollection();
		subfiles.get_all_fetch(this.model.get("children"));
		var self = this;
		subfiles.forEach(function(entry){
			console.log(self.$el.find("#clipboard_item_" + entry.id));
			var clipboard_item_view = new ClipboardItem({
				containing_list_view: self.containing_list_view,
				el: self.$el.find("#clipboard_item_" + entry.id),
				model: entry,
				indent : self.indent,
			});
		});
	}
});



/*TODO: Add in ClipboardDeletedItemView*/

module.exports = {
	ClipboardList:ClipboardList
}