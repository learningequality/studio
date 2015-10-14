var Backbone = require("backbone");
var _ = require("underscore");
require("channel_create.less");
require("dropzone/dist/dropzone.css");

var list_index;
var current_channel;
var new_channel_template = require("./hbtemplates/channel_editor.handlebars");
var channel_template = require("./hbtemplates/channel_container.handlebars");
var TextHelper = require("edit_channel/utils/TextHelper");

window.ManageChannelsView  = Backbone.View.extend({
	template: require("./hbtemplates/channel_create.handlebars"),
	//url: '/api',
	initialize: function() {
		_.bindAll(this, 'toggle_channel', 'upload_pic', 'open_channel', 'save_channel','edit_channel','delete_channel','new_channel','expand_channel','minimize_channel');
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
		'click .new_channel' : 'new_channel',
		'click .filler' : 'expand_channel',
		'click .minimize' : 'minimize_channel'
	},
	new_channel: function(event){
		if(!current_channel){
			$("#channel_list").append(new_channel_template({edit: false, index : list_index}));
			list_index++;
			setEditing(true);
			current_channel = null;
		}
	},
	delete_channel: function(event){
		if(confirm("Are you sure you want to delete this channel?")){
			if($("#"+event.target.parentNode.parentNode.id).hasClass("channel_editor")){
				setEditing(false);
				current_channel = null;
			}
			$("#"+event.target.parentNode.parentNode.id).remove();
		}
		
	},
	edit_channel: function(event){
		if(!current_channel){
			var id = "#" + event.target.parentNode.parentNode.id;
			current_channel = $(id).data("data");
			$(id).after(new_channel_template({edit: true, index : event.target.parentNode.id.split("_")[1],
			channel: {title:  $(id + " #channel_name").text().trim(),
			description: $(id +" #channel_description").text().trim()}}));
			$(id).remove();
			setEditing(true);
			
		}
	},
	toggle_channel: function(event){
		if(current_channel){
			var index = event.target.parentNode.id.split("_")[2];
			$("#"+event.target.parentNode.id).after(channel_template({index: index, channel: {title: current_channel.title, description: current_channel.description}}));
			$("#item_"+index).data("data",current_channel);
			current_channel = $("#item_"+index).data("data");
		}
		
		$("#"+event.target.parentNode.id).remove();
		current_channel = null;
		setEditing(false);
	},
	open_channel: function(event){
		console.log("Opening channel");
		var EditViews = require("edit_channel/views");
		new EditViews.EditView({
			el: $("#channel-container"),
			model: this.model,
			edit: true,
			channel: $("#" + event.target.parentNode.parentNode.id).data("data")
		});
	},
	save_channel: function(event){
		var index = event.target.parentNode.id.split("_")[2];
		var title = $("#new_channel_name").val().trim();
		var channel = {title: (title == "")? "[Untitled Channel]" : title, description: $("#new_channel_description").val()};
		console.log(channel);
		$("#"+event.target.parentNode.id).after(channel_template({index: index, channel: channel}));
		$("#item_"+index).data("data",channel);
		$("#"+event.target.parentNode.id).remove();
		current_channel = null;
		setEditing(false);
	},
	upload_pic: function(event){
		console.log("Uploading Picture");
	},
	expand_channel: function(event){
		TextHelper.manageFolder(event, true);
	},
	minimize_channel: function(event){
		TextHelper.manageFolder(event, false);
	}

});

function loadChannels(model){
	model.channels.forEach(function(entry){
		//if(entry.attributes... See if user has access to channel)
		$("#channel_list").append(channel_template({index: list_index, channel: entry.toJSON()}));
		$("#item_"+list_index).data("data",entry.attributes);
		console.log(entry.attributes);
		$("#item_"+list_index + " #channel_name").html(TextHelper.trimText(entry.attributes.title, "...", 35, false));
		$("#item_"+list_index + " #channel_description").html(TextHelper.trimText(entry.attributes.description, "... read more", 300, true));
		list_index++;
	});
}

function setEditing(isEditing){
	if(isEditing){
		$(".edit_channel").prop("disabled", true);
		$(".new_channel").prop("disabled", true);
		$(".edit_channel").css("cursor", "not-allowed");
		$(".new_channel").css("cursor", "not-allowed");
		//$(".new_channel_pic").dropzone({ url: "/channel_create" });
		
	} else{
		$(".edit_channel").prop("disabled", false);
		$(".edit_channel").css("cursor", "pointer");
		$(".new_channel").prop("disabled", false);
		$(".new_channel").css("cursor", "pointer");
	}
}

module.exports = {
	ManageChannelsView : ManageChannelsView 
}