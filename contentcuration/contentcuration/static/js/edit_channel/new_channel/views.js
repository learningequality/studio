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

        var self = this;
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
		var self = this;
		$("#channel_selection_dropdown_list").html("");
		this.collection.forEach(function(entry){
			var view = new ChannelListItem({
				model: entry,
				edit: false,
				containing_list_view: self,
				channel_list: self.collection.toJSON()
			});
			self.$("#channel_list").append(view.el);
			self.views.push(view);
        	$("#channel_selection_dropdown_list").append("<li><a href='" + entry.get("channel_id") + "/edit' class='truncate'>" + entry.get("name") + "</a></li>");
		});
	}
});

/*
	edit: determines whether to load channel or editor
*/
var ChannelListItem = BaseViews.BaseListChannelItemView.extend({
	tagName: "li",
	id: function(){
		return (this.model)? this.model.get("channel_id") : "new";
	},
	className:"channel_container container",
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
			channel: (this.model) ? this.model.attributes : null,
			total_file_size: (this.model)? this.model.get("resource_size") : 0,
			resource_count: (this.model)? this.model.get("resource_count") : 0,
			picture: "/static/img/unicef logo.jpg",
			channel_link : (this.model) ? this.model.get("channel_id") : null
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
		if(this.model && (confirm("WARNING: All content under this channel will be permanently deleted."
					+ "\nAre you sure you want to delete this channel?"))){
			var self = this;
			this.display_load("Deleting Channel...", function(){
				self.delete();
			});
		}else if(!this.model){
			this.containing_list_view.set_editing(false);
			this.delete_view();
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
		var self = this;
		self.containing_list_view.set_editing(false);
		var title = (self.$el.find("#new_channel_name").val().trim() == "")? "[Untitled Channel]" : self.$el.find("#new_channel_name").val().trim();
		var description = (self.$el.find("#new_channel_description").val() == "") ? " " : self.$el.find("#new_channel_description").val();
		var data = {name: title, description: description};
		this.display_load("Saving Channel...", function(){
			self.save(data, {async:false});
			self.edit = false;
			self.render();
		});
	}
});

module.exports = {
	ChannelList : ChannelList
}