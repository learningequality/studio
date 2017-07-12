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

var BaseAdminItem = BaseViews.BaseListNodeItemView.extend({
	className: "data_row row",
	tagName:"div",

	initialize: function(options) {
		this.containing_list_view = options.containing_list_view;
		this.render();
	},
	render:function(){
		this.$el.html(this.template(this.model.toJSON()));
		this.create_popover();
	},
	create_popover:function(){
		var self = this;
		this.$el.find(".popover_link").popover({
			html: true,
			placement: "bottom",
			trigger: "focus",
			toggle: "popover",
			content: function () {
		        return $(this.dataset.id).html();
		    }
		});
	}
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


var ChannelItem = BaseAdminItem.extend({
	template: require("./hbtemplates/channel_item.handlebars"),
	className: "data_row row",
	tagName:"div"
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


var UserItem = BaseAdminItem.extend({
	template: require("./hbtemplates/user_item.handlebars"),
});


module.exports = {
	AdminView: AdminView
}
