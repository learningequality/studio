var Backbone = require("backbone");
var _ = require("underscore");
var Models = require("./models");

var clipboardContent = [];

var BaseView = Backbone.View.extend({
	item_view: null,
	initialize: function() {
		this.render();
	},
	render: function() {

	}
});

BaseListView = Backbone.View.extend({
	item_view: null,
	items: [],
	allow_edit: false,
	initialize: function() {
		this.items = new Bac
	},
	save: function(item){
		/* TODO: Implement funtion to allow saving one item */
	},
	save_all: function(){
		/* TODO: Implement function to save all items on list */
		if(item_view == "ChannelView"){
			/* TODO: Save all channels in list */
			//items.forEach(entry) ...
		} else{
			/* TODO: Save all topics/content in list */
		}
	},

	set_editing: function(edit_mode_on){
		if(this.item_view=="ChannelView"){
			$(".edit_channel").prop("disabled", edit_mode_on);
			$("#new_channel_button").prop("disabled", edit_mode_on);
			$(".edit_channel").css("cursor", (edit_mode_on) ? "not-allowed" : "pointer");
			$("#new_channel_button").css("cursor", (edit_mode_on) ? "not-allowed" : "pointer");
		}else{
			$(".edit_folder_button").css('visibility', (edit_mode_on)?'hidden' : 'visible');
			$(".edit_file_button").css('visibility',(edit_mode_on)?'hidden' : 'visible');
			$(".content_options button").prop('disabled',edit_mode_on);
		}
	}
});


var BaseListItemView = Backbone.View.extend({
	initialize: function() {
		_.bindAll(this, 'delete_content','toggle_folder', 'preview_file', 'trimText');
	},
	delete_content:function(event){
		if(confirm("Are you sure you want to delete this file?")){
			var el ="#" + $(event.target).parent("li").id;
			var i = clipboard_list_items.indexOf($("#" + el.id).data("data"));
			console.log($("#" + el.id).data("data"));
			console.log(clipboard_list_items[0]);
			if(i != -1) console.log(clipboard_list_items[i]);
			//clipboard_list_items.remove(i);
			el.remove();
			
		}
	},
	toggle_folder: function(event){
		event.preventDefault();
		var el =  "#" + $(event.target).parent("li").id;
		if($(el).data("collapsed")){
			$(el + "_sub").slideDown();
			$(el).data("collapsed", false);
			$(el+" .tog_folder span").attr("class", "glyphicon glyphicon-menu-down");
		}
		else{
			$(el + "_sub").slideUp();
			$(el).data("collapsed", true);
			$(el+" .tog_folder span").attr("class", "glyphicon glyphicon-menu-up");
		}
	},
	preview_file: function(event){
		event.preventDefault();
		//var file = $("#"+ DOMHelper.getParentOfTag(event.target, "li").id);
		var view = new PreviewerViews.PreviewerView({
			el: $("#previewer-area"),
			//model: file.data("data"),
			//file: file
		});
	},

	trimText:function(string, limit, el){
		if(string.trim().length - 4 > limit){
			string = string.trim().substring(0, limit - 4) + "...";
			//if(el) el.show();
		}
		//else
		//	if(el) el.hide();
		return string;
	}
});

var BaseEditor = Backbone.View.extend({
	el : " ",
	/*
	item_view: null,
	initialize: function() {
		_.bindAll(this, 'delete_content','toggle_folder', 'preview_file', 'trimText');
	},
	update_folder: function(event){
		if($("#folder_name").val().trim() == "")
			$("#name_err").css("display", "inline");
		else{
			this.folder.update({
				title: $("#folder_name").val(), 
				description: $("#folder_description").val()
			});
			this.delete_view();
		}
	},
	*/
	updateCount: function(){
		var char_length = this.char_limit - this.$el.val().length; 
		console.log(char_length);
		this.$('.char_counter').text(char_length + ((char_length != 1)? " chars" : " char") + ' left');

		if(char_length == 0) 
			this.$(".char_counter").css("color", "red");
		else 
			this.$(".char_counter").css("color", "black");
	},
	trimText:function(string, limit, el){
		if(string.trim().length - 4 > limit){
			string = string.trim().substring(0, limit - 4) + "...";
			if(el) el.show();
		}
		else
			if(el) el.hide();
		return string;
	}
});

var BaseQueue = Backbone.View.extend({

});

/*
var EditView = Backbone.View.extend({
	template: require("./hbtemplates/channel_edit.handlebars"),
	url: '/api',
	initialize: function(options) {
		_.bindAll(this, 'open_edit', 'open_preview', 'open_trash', 'open_publish','open_clipboard');
		console.log("current channel", window.current_channel);
		this.channel = options.topictree;
		this.render();
		this.open_edit();
	},
	render: function() {
		this.$el.html(this.template(this.model));
		console.log("rendering edit view");
		/*
		$("#clipboard-toggler").show();
		$("#channel-selector").css("display", "inline-block");
		$("#content-search").css("display", "inline-block");
		$("#channel-dropdown").html(this.channel.name);
		$("#channel_select").empty();
		this.model.channels.forEach(function(entry){
			$("#channel_select").append("<li>" + entry.name + "</li>");
		});
		*/
/*	},
	events: {
		'click #channel-edit-button': 'open_edit',
		'click #channel-preview-button': 'open_preview',
		'click #channel-trash-button':'open_trash',
		'click #channel-publish-button': 'open_publish',
		'click #clipboard-toggler' : 'open_clipboard'
	},
	
	open_edit: function(){
		$("#clipboard-toggler").show();
		window.channel_router.navigate(this.channel.name + "/edit", {trigger: true});
	},
	
	open_preview: function(){
		$("#clipboard-toggler").hide();
		$("#clipboard").hide();
		window.channel_router.navigate(this.channel.name + "/preview", {trigger: true});
	},

	open_trash: function(){
		$("#clipboard-toggler").show();
		window.channel_router.navigate(this.channel.name + "/trash", {trigger: true});
	},
	open_clipboard: function(){
		var ClipboardViews = require("edit_channel/clipboard/views");
		new ClipboardViews.ClipboardListView({
			el: $("#clipboard-area"),
		});
	},

	//Todo: Change to actually publish the channel (i.e. add to published tree)
	open_publish: function(){
		if(confirm("Are you sure you want to publish?")){
			console.log("Publishing Channel");
			new BaseView({
				el: $("#channel-container"),
			});
		}
	}
});

function addToClipboard(){
	//clipboardContent
}
*/

module.exports = {
	BaseView: BaseView,
	BaseListView:BaseListView,
	BaseListItemView: BaseListItemView
}