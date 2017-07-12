var Backbone = require("backbone");
var Models = require("edit_channel/models");
var _ = require("underscore");
require("admin.less");
var BaseViews = require("edit_channel/views");
var dialog = require("edit_channel/utils/dialog");

var AdminView = BaseViews.BaseView.extend({
	lists: [],
	template: require("./hbtemplates/admin_area.handlebars"),
	initialize: function(options) {
		this.channel_collection = options.channel_collection;
		this.users_collection = options.users_collection;
		this.render();
	},
	render: function() {
		this.$el.html(this.template());
		this.channel_list = new ChannelList({
			collection:this.channel_collection,
			el: this.$("#admin_channels")
		});
		this.channel_list = new UserList({
			collection:this.users_collection,
			el: this.$("#admin_users")
		});
	}
});

var BaseAdminList = BaseViews.BaseListView.extend({
	list_selector:".admin_table",
	default_item:".admin_table .default-item",

	initialize: function(options) {
		this.collection = options.collection;
		this.render();
	},
	render: function() {
		this.$el.html(this.template());
		this.load_content();
	},
	create_new_view:function(model){
		var newView = new ChannelItem({
			model: model,
			containing_list_view:this
		});
		this.views.push(newView);
		return newView;
	},
});

var ChannelList = BaseAdminList.extend({
	template: require("./hbtemplates/channel_list.handlebars"),
	list_selector:".channel_list",
	default_item:".channel_list .default-item",
	create_new_view:function(model){
		var newView = new ChannelItem({
			model: model,
			containing_list_view:this
		});
		this.views.push(newView);
		return newView;
	},
});


var ChannelItem = BaseViews.BaseListNodeItemView.extend({
	template: require("./hbtemplates/channel_item.handlebars"),
	className: "data_row row",
	tagName:"div",

	initialize: function(options) {
		this.containing_list_view = options.containing_list_view;
		this.render();
	},
	render:function(){
		console.log(this.model.toJSON())
		this.$el.html(this.template({
			channel: this.model.toJSON()
		}));
		this.create_popover();
	},
	create_popover:function(){
		var self = this;
		this.$el.find(".admin_channel_id").popover({
			animation:false,
			trigger:"manual",
			html: true,
			selector: '[rel="popover"]',
			content: function () {
		        return $("#admin_channel_" + self.model.get("id")).html();
		    }
		}).click(function(event){
			var hadClass = $(this).hasClass("active-popover");
			$('.admin_channel_id').each(function() {
	            $(this).popover('hide');
	            $(this).removeClass("active-popover");
	        });
			if(!hadClass){
				$(this).popover('show');
	        	$(this).addClass("active-popover");
			}
	        event.preventDefault();
	        event.stopPropagation();
		});
	}
});

var UserList = BaseAdminList.extend({
	template: require("./hbtemplates/user_list.handlebars"),
	list_selector:".user_list",
	default_item:".user_list .default-item",
	create_new_view:function(model){
		var newView = new UserItem({
			model: model,
			containing_list_view:this
		});
		this.views.push(newView);
		return newView;
	},
});


var UserItem = BaseViews.BaseListNodeItemView.extend({
	template: require("./hbtemplates/user_item.handlebars"),
	className: "data_row row",
	tagName:"div",

	initialize: function(options) {
		this.containing_list_view = options.containing_list_view;
		this.render();
	},
	render:function(){
		console.log(this.model.toJSON())
		this.$el.html(this.template({
			user: this.model.toJSON()
		}));
	}
});


module.exports = {
	AdminView: AdminView
}
