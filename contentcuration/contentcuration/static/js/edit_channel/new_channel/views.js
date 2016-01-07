var Backbone = require("backbone");
var _ = require("underscore");
var Quill = require("quilljs");
var Dropzone = require("dropzone");
require("channel_create.less");
require("dropzone/dist/dropzone.css");
require("quilljs/dist/quill.snow.css");
var BaseViews = require("./../views");
	
var ManageChannelsView  = BaseListView.extend({
	template: require("./hbtemplates/channel_create.handlebars"),
	item_view: "ChannelView", // TODO: Use to indicate how to save items on list

	initialize: function(options) {
		_.bindAll(this, 'new_channel', 'load_channels', 'set_editing');
		this.channels = options.channels;
		this.render();
		this.listenTo(this.channels, "sync", this.render);
        this.listenTo(this.channels, "remove", this.render);
	},
	render: function() {
		this.set_editing(false);
		this.$el.html(this.template());
		this.load_channels(this.items, this);
	},
	events: {
		'click #new_channel_button' : 'new_channel',
	},

	new_channel: function(event){
		this.set_editing(true);
		var new_channel = new ChannelView({
			edit:true,
			container: this
		});
		$("#channel_list").append(new_channel.el);
	},

	load_channels: function(list, container){
		/* TODO: need to filter out channels according to user */
		this.channels.forEach(function(entry){
			var view = new ChannelView({
				channel: entry, 
				edit: false,
				container: container
			});
			$("#channel_list").append(view.el);
			list.push(view);
		});
		$(".default-item").css("visibility", (this.items.length == 0)? "visible" : "hidden");
	},

	set_editing: function(isEditing){
		$(".edit_channel").prop("disabled", isEditing);
		$("#new_channel_button").prop("disabled", isEditing);
		$(".edit_channel").css("cursor", (isEditing) ? "not-allowed" : "pointer");
		$("#new_channel_button").css("cursor", (isEditing) ? "not-allowed" : "pointer");
		//$(".new_channel_pic").dropzone({ url: "/channel_create" });
	}
});

var ChannelView = BaseViews.BaseListItemView.extend({
	template: require("./hbtemplates/channel_container.handlebars"),
	initialize: function(options) {
		_.bindAll(this, 'edit_channel','delete_channel','delete_view', 'toggle_channel','save_channel');
		this.channel = options.channel;
		this.edit = options.edit;
		this.container = options.container;
		this.render();
	},

	render: function() {
		this.$el.html(this.template({
			edit: this.edit, 
			channel: (this.channel) ? this.channel.attributes : null
		}));
	},
	events: {
		'click .edit_channel':'edit_channel',
		'click .delete_channel' : 'delete_channel',
		'click .channel_toggle': 'toggle_channel',
		'click .save_channel': 'save_channel'
	},

	edit_channel: function(event){
		this.container.set_editing(true);
		this.edit = true;
		this.render();
	},

	delete_channel: function(event){
		if(confirm("Are you sure you want to delete this channel?")){
			window.channel_router.delete_channel(this.channel);
			if($("#channel_list li").length == 1)
				$(".default-item").css("visibility", "visible");
			this.delete_view();
		}
	},
	delete_view: function(){
		this.undelegateEvents();
		this.unbind();		
		this.remove();
	},
	toggle_channel: function(event){
		this.container.set_editing(false);
		if(this.channel){
			this.edit = false;
			this.render();
		}else{
			this.delete_view();
			window.channel_manager_view.render();
		}
	},
	save_channel: function(event){
		this.container.set_editing(false);
		var title = ($("#new_channel_name").val().trim() == "")? "[Untitled Channel]" : $("#new_channel_name").val().trim();
		//title = (title == "")? "[Untitled Channel]" : title;
		var description = ($("#new_channel_description").val() == "") ? " " : $("#new_channel_description").val();

		var channel = {name: title, description: description};
		
		window.channel_router.save_channel(channel, this.channel);
		
	}
});
/*
function save(model, collection){
	model.save();
	collection.save();
}
*/
module.exports = {
	ManageChannelsView : ManageChannelsView 
}