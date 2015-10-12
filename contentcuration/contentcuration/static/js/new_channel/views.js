var Backbone = require("backbone");
var _ = require("underscore");
require("channel_create.less");

var list_index;
var current_channel;
var new_channel_template = require("./hbtemplates/channel_editor.handlebars");
var channel_template = require("./hbtemplates/channel_container.handlebars");

window.NewChannelView  = Backbone.View.extend({
	template: require("./hbtemplates/channel_create.handlebars"),
	//url: '/api',
	initialize: function() {
		_.bindAll(this, 'toggle_channel', 'upload_pic', 'open_channel', 'save_channel','edit_channel','delete_channel','new_channel');
		list_index = 0;
		current_channel = null;
		this.render();
	},
	render: function() {
		this.$el.html(this.template(this.model));
		loadChannels(this.model);
	},
	events: {
		'click .channel_toggle': 'toggle_channel',
		'click .new_channel_pic' : 'upload_pic',
		'click .open_channel':'open_channel',
		'click .save_channel': 'save_channel',
		'click .edit_channel':'edit_channel',
		'click .delete_channel' : 'delete_channel',
		'click .new_channel' : 'new_channel'
	},
	new_channel: function(event){
		if(!current_channel){
			$("#channel_list").append(new_channel_template({edit: false, index : list_index}));
			list_index++;
		}
	},
	delete_channel: function(event){
		if(confirm("Are you sure you want to delete this channel?")){
			$("#"+event.target.parentNode.parentNode.id).remove();
		}
		current_channel = null;
	},
	edit_channel: function(event){
		if(!current_channel){
			var id = "#" + event.target.parentNode.parentNode.id;
			current_channel = $(id).data("data");
			$(id).after(new_channel_template({edit: true, index : event.target.parentNode.id.split("_")[1],
			channel: {title:  $(id + " #channel_name").text(),
			description: $(id +" #channel_description").text()}}));
			$(id).remove();
		}
	},
	toggle_channel: function(event){
		if(current_channel){
			var index = event.target.parentNode.id.split("_")[2];
			$("#"+event.target.parentNode.id).after(channel_template({index: index, channel: {title: current_channel.attributes.title, description: current_channel.attributes.description}}));
			$("#item_"+index).data("data",current_channel);
			current_channel = $("#item_"+index).data("data");
		}
		
		$("#"+event.target.parentNode.id).remove();
		current_channel = null;
	},
	open_channel: function(event){
		console.log("Opening channel");
	},
	save_channel: function(event){
		var index = event.target.parentNode.id.split("_")[2];
		var channel = {title: $("#new_channel_name").val(), description: $("#new_channel_description").val()};
		console.log("#"+event.target.parentNode.id);
		$("#"+event.target.parentNode.id).after(channel_template({index: index, channel: channel}));
		$("#item_"+index).data("data",channel);
		$("#"+event.target.parentNode.id).remove();
		current_channel = null;
	},
	upload_pic: function(event){
		console.log("Uploading Picture");
	}

});

function loadChannels(model){
	model.channels.forEach(function(entry){
		//if(entry.attributes... See if user has access to channel)
		$("#channel_list").append(channel_template({index: list_index, channel: entry.toJSON()}));
		$("#item_"+list_index).data("data",entry);
		list_index++;
	});
	
}

module.exports = {
	NewChannelView: NewChannelView
}