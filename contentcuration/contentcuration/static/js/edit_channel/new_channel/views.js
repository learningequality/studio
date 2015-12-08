var Backbone = require("backbone");
var _ = require("underscore");
var Quill = require("quilljs");
var Dropzone = require("dropzone");
require("channel_create.less");
require("dropzone/dist/dropzone.css");
require("quilljs/dist/quill.snow.css");
var BaseViews = require("./../views");
	
var ManageChannelsView  = Backbone.View.extend({
	template: require("./hbtemplates/channel_create.handlebars"),
	initialize: function(options) {
		_.bindAll(this, 'new_channel', 'load_channels', 'add_channel');
		this.channels = options.channels;
		this.render();
		this.listenTo(this.channels, "sync", this.render);
        this.listenTo(this.channels, "remove", this.render);
	},
	render: function() {
		setEditing(false);
		this.$el.html(this.template());
		this.load_channels();
	},
	events: {
		'click .new_channel' : 'new_channel',
	},

	new_channel: function(event){
		setEditing(true);
		//window.channel_router.create();
		$("#channel_list").append("<div id=\"container-edit-area\"></div>");
		var channel_editor = new ChannelEditorView({
			el: $("#container-edit-area"),
			edit:false,
		});
	},
	add_channel: function(){
		this.channels.create();
	},

	load_channels: function(){
		if(this.channels.length > 0){
			$(".default-item").css("visibility", "hidden");
			this.channels.forEach(function(entry){
				var view = new ChannelView({channel: entry});
				$("#channel_list").append(view.el);
				//$("#item_"+list_index + " #channel_name").html(TextHelper.trimText(entry.attributes.name, "...", 35, false));
				//$("#item_"+list_index + " #channel_description").html(TextHelper.trimText(entry.description, "... read more", 300, true));
			});
		} else{
			$(".default-item").css("visibility", "visible");
		}
	}
});

var ChannelView = BaseViews.BaseListItemView.extend({
	template: require("./hbtemplates/channel_container.handlebars"),
	initialize: function(options) {
		_.bindAll(this, 'open_channel', 'edit_channel','delete_channel','delete_view');
		this.channel = options.channel;
		this.render();
	},
	render: function() {
		this.$el.html(this.template({channel: this.channel.attributes}));
	},
	events: {
		'click .open_channel':'open_channel',
		'click .edit_channel':'edit_channel',
		'click .delete_channel' : 'delete_channel'
	},
	open_channel: function(event){
		window.channel_router.set_channel(this.channel);
	},

	edit_channel: function(event){
		/*this.template = require("./hbtemplates/channel_editor.handlebars");
		this.render();*/
		this.$el.after("<div id=\"container-edit-area\"></div>");
		var channel_editor = new ChannelEditorView({
			el: $("#container-edit-area"),
			channel: this.channel,
			edit: true,
		});
		this.delete_view();
		setEditing(true);
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
	}
});

var ChannelEditorView = Backbone.View.extend({
	template: require("./hbtemplates/channel_editor.handlebars"),
	//url: '/api',
	initialize: function(options) {
		_.bindAll(this, 'toggle_channel', 'upload_pic', 'save_channel','delete_channel');
		this.edit = options.edit;
		this.channel = options.channel;
		
		this.render();
		
	},
	render: function() {
		if(this.edit)
			this.$el.html(this.template({
				channel: this.channel.attributes, 
				edit: this.edit, 
				index: this.index
			}));
		else
			this.$el.html(this.template({
				edit: this.edit, 
				index: this.index
			}));
		/*
		this.name_editor = new Quill("#new_channel_name");
		this.name_editor.on('text-change', function(delta, source) {
			console.log('Editor contents have changed', delta);
		  });
		this.description_editor = new Quill("#new_channel_description");
		this.description_editor.on('text-change', function(delta, source) {
			console.log('Editor have changed', delta);
		  });
		  */
	},
	events: {
		'click .channel_toggle': 'toggle_channel',
		'click .new_channel_pic' : 'upload_pic',
		'click .save_channel': 'save_channel',
		'click .delete_channel' : 'delete_channel'
	},
	toggle_channel: function(event){
		setEditing(false);
		this.delete_view();
		window.channel_manager_view.render();
	},
	save_channel: function(event){
		setEditing(false);
		var title = ($("#new_channel_name").val().trim() == "")? "[Untitled Channel]" : $("#new_channel_name").val().trim();
		//title = (title == "")? "[Untitled Channel]" : title;
		var description = ($("#new_channel_description").val() == "") ? " " : $("#new_channel_description").val();

		var channel = {name: title, description: description};
		
		window.channel_router.save_channel(channel, this.channel);
		
	},
	delete_channel: function(event){
		if(confirm("Are you sure you want to delete this channel?")){
			setEditing(false);
			
			this.delete_view();
			if($("#channel_list li").length == 1)
				$(".default-item").css("visibility", "visible");
			if(this.edit){
				//delete from db
			}
		}
	},
	upload_pic: function(event){
		console.log("Uploading Picture");
	},
	delete_view: function(){
		this.undelegateEvents();
		this.unbind();		
		this.remove();
	}
});

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

function save(model, collection){
	model.save();
	collection.save();
}

module.exports = {
	ManageChannelsView : ManageChannelsView 
}