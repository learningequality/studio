var Backbone = require("backbone");
var _ = require("underscore");
require("channel_create.less");
var Dropzone = require("dropzone");    //For later when images are added to channels
require("dropzone/dist/dropzone.css"); //For later when images are added to channels
var BaseViews = require("./../views");
	
var ChannelList  = BaseListView.extend({
	template: require("./hbtemplates/channel_create.handlebars"),
	item_view: "channel", // TODO: Use to indicate how to save items on list

	initialize: function(options) {
		_.bindAll(this, 'new_channel');
		this.collection = options.channels;
		this.render();
		this.user = options.user;
        this.listenTo(this.collection, "remove", this.render);
        this.listenTo(this.collection, "sync", this.render);

	},
	render: function() {
		this.set_editing(false);
		this.$el.html(this.template({
			channel_list: this.collection.toJSON(),
			user: this.user
		}));
		this.load_content();
	},
	events: {
		'click .new_channel_button' : 'new_channel'
	},

	new_channel: function(event){
		this.set_editing(true);
		var new_channel = new ChannelListItem({
			edit:true,
			containing_list_view: this,
			default_license: window.licenses.get_default(),
		});
		this.$el.find("#channel_list").append(new_channel.el);
	},
	load_content:function(){
		var containing_list_view = this;
		this.collection.forEach(function(entry){
			var view = new ChannelListItem({
				el : containing_list_view.$el.find("#channel_list #" + entry.id),
				model: entry, 
				edit: false,
				containing_list_view: containing_list_view,
				channel_list: containing_list_view.collection.toJSON()
			});
			containing_list_view.views.push(view);
        	$("#channel_selection_dropdown_list").append("<li><a href='" + entry.id + "/edit' class='truncate'>" + entry.get("name") + "</a></li>");
		});
	}
});

/*
	edit: determines whether to load channel or editor
*/
var ChannelListItem = BaseViews.BaseListItemView.extend({
	tagName: "li",
	template: require("./hbtemplates/channel_container.handlebars"),
	initialize: function(options) {
		_.bindAll(this, 'edit_channel','delete_channel','toggle_channel','save_channel');
		this.listenTo(this.model, "sync", this.render);
		this.edit = options.edit;
		this.containing_list_view = options.containing_list_view;
		this.default_license = options.default_license;
		this.render();
	},

	render: function() {
		this.$el.html(this.template({
			edit: this.edit, 
			channel: (this.model) ? this.model.attributes : null
		}));
		this.$el.addClass('channel_container');
	},
	events: {
		'click .edit_channel':'edit_channel',
		'click .delete_channel' : 'delete_channel',
		'click .channel_toggle': 'toggle_channel',
		'click .save_channel': 'save_channel'
	},

	edit_channel: function(event){
		this.containing_list_view.set_editing(true);
		this.edit = true;
		this.render();
	},

	delete_channel: function(event){
		if(confirm("WARNING: All content under this channel will be permanently deleted."
					+ "\nAre you sure you want to delete this channel?")){
			this.delete(true);
		}
	},
	toggle_channel: function(event){
		this.containing_list_view.set_editing(false);
		if(this.model){
			this.edit = false;
			this.render();
			console.log("first");
		}else{
			this.delete_view();
			console.log("second");
		}
	},
	save_channel: function(event){
		var self = this;
		this.display_load(function(){
			self.containing_list_view.set_editing(false);
			var title = (self.$el.find("#new_channel_name").val().trim() == "")? "[Untitled Channel]" : self.$el.find("#new_channel_name").val().trim();
			var description = (self.$el.find("#new_channel_description").val() == "") ? " " : self.$el.find("#new_channel_description").val();
			var data = {name: title, description: description};
			self.save(data);
		});
	}
});

module.exports = {
	ChannelList : ChannelList 
}