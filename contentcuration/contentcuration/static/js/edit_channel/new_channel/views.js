var Backbone = require("backbone");
var _ = require("underscore");
var Quill = require("quilljs");
var Dropzone = require("dropzone");
require("channel_create.less");
require("dropzone/dist/dropzone.css");
require("quilljs/dist/quill.snow.css");
var BaseViews = require("./../views");
	
var ChannelList  = BaseListView.extend({
	template: require("./hbtemplates/channel_create.handlebars"),
	item_view: "channel", // TODO: Use to indicate how to save items on list

	initialize: function(options) {
		_.bindAll(this, 'new_channel');
		this.collection = options.channels;
		this.render();
        this.listenTo(this.collection, "remove", this.render);
        this.listenTo(this.collection, "sync", this.render);
	},
	render: function() {
		this.set_editing(false);
		this.$el.html(this.template({channel_list: this.collection.toJSON()}));
		this.load_content();
	},
	events: {
		'click #new_channel_button' : 'new_channel',
	},

	new_channel: function(event){
		this.set_editing(true);

		var new_channel = new ChannelListItem({
			edit:true,
			containing_list_view: this
		});
		this.$el.find("#channel_list").append("<li class='channel_container container' id='new'></li>")
		this.$el.find("#new").append(new_channel.el);
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
		});
	}
});

/*
	edit: determines whether to load channel or editor
*/
var ChannelListItem = BaseViews.BaseListItemView.extend({
	template: require("./hbtemplates/channel_container.handlebars"),
	initialize: function(options) {
		_.bindAll(this, 'edit_channel','delete_channel','toggle_channel','save_channel');
		this.listenTo(this.model, "sync", this.render);
		this.edit = options.edit;
		this.containing_list_view = options.containing_list_view;
		this.render();
	},

	render: function() {
		this.$el.html(this.template({
			edit: this.edit, 
			channel: (this.model) ? this.model.attributes : null,
		}));
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
		}else{
			this.delete_view();
		}
	},
	save_channel: function(event){
		this.containing_list_view.set_editing(false);
		var title = (this.$el.find("#new_channel_name").val().trim() == "")? "[Untitled Channel]" : this.$el.find("#new_channel_name").val().trim();
		var description = (this.$el.find("#new_channel_description").val() == "") ? " " : this.$el.find("#new_channel_description").val();
		var data = {name: title, description: description};
		var container = this;
		var cssfunc = function(){
			console.log("called this");
			container.$el.css("opacity", "0.4");
			container.$el.prop("disabled", true);
		}
		$.when(container.save(data), cssfunc()).then(function(){
			//container.render();
			console.log("ended");
		});
	}
});

module.exports = {
	ChannelList : ChannelList 
}