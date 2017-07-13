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
        this.$el.html(this.template({channels: this.channel_collection, users: this.users_collection}));
        this.channel_list = new ChannelTab({
            collection:this.channel_collection,
            el: this.$("#admin_channels")
        });
        this.channel_list = new UserTab({
            collection:this.users_collection,
            el: this.$("#admin_users")
        });
    }
});

var BaseAdminTab = BaseViews.BaseListView.extend({
    search_selector: "",
    filters: [],
    sort_filters: [],
    initialize: function(options) {
        this.collection = options.collection;
        this.render();
    },
    events: {
        "change .filter_input" : "apply_filter",
        "keyup .search_input" : "apply_search",
        "paste .search_input" : "apply_search",
        "change .select_all" : "check_all",
    },
    render: function() {
        this.$el.html(this.template({filters: this.filters, sort_filters: this.sort_filters}));
        this.apply_filter();
    },
    check_all: function(event){ this.admin_list.check_all(event); },
    get_filtered_result: function(){
        var asc = this.$(".order_input").val() === "ascending";
        var filter = _.findWhere(this.filters, {'key': this.$(".view_input").val()}).filter;
        var sort = _.findWhere(this.sort_filters, {'key': this.$(".sort_input").val()}).filter;
        var filtered_collection = new Models.ContentNodeCollection(this.collection.filter(filter));
        filtered_collection.set_comparator(function(item1, item2){return sort(item1, asc, item2);});
        filtered_collection.sort();
        return filtered_collection;
    },
    get_search_result: function(text){
        var q = this.check_search;
        var text = this.$(this.search_selector).val().trim().toLowerCase();
        var re = new RegExp(text, "i");
        return this.collection.chain()
            .filter(function(item) {return q(item, text, re);})
            .pluck('id').value();
    },
    apply_search: function() {
        var self = this;
        _.defer(function(){
            self.admin_list.apply_search(self.get_search_result());
        }, 500);
    },

    /* Implement in subclasses */
    apply_filter: function() { },
    check_search: function(item) { return false; },
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
    apply_search: function(matches){
        _.each(this.views, function(view){
            view.$el.css('display', (_.contains(matches, view.model.id))? "block" : "none");
        });
    }
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


var ChannelTab = BaseAdminTab.extend({
    template: require("./hbtemplates/channel_tab.handlebars"),
    search_selector: "#admin_channel_search",
    filters: [
        {
            key: "all",
            label: "All",
            selected: true,
            filter: function(item){ return true; }
        }, {
            key: "live",
            label: "Live",
            filter: function(item){ return !item.get('deleted'); }
        }, {
            key: "deleted",
            label: "Deleted",
            filter: function(item){ return item.get('deleted'); }
        }, {
            key: "staged",
            label: "Needs Review",
            filter: function(item){ return item.get('staging_tree'); }
        }, {
            key: "ricecooker",
            label: "Sushi Chef",
            filter: function(item){ return item.get('ricecooker_version'); }
        }
    ],
    sort_filters: [
        {
            key: "name",
            label: "Name",
            selected: true,
            filter: function(item1, asc, item2){
                return (asc) ?
                    item1.get('name').localeCompare(item2.get('name')) :
                    -item1.get('name').localeCompare(item2.get('name'));
            }
        }, {
            key: "id",
            label: "Channel ID",
            filter: function(item1, asc, item2){
                return (asc) ? item1.id.localeCompare(item2.id) : -item1.id.localeCompare(item2.id);
            }
        }, {
            key: "modified",
            label: "Last Updated",
            filter: function(item, asc){
                return (asc)? new Date(item.get('modified')) : -new Date(item.get('modified'));
            }
        }, {
            key: "created",
            label: "Date Created",
            filter: function(item, asc){
                return (asc)? new Date(item.get('created')) : -new Date(item.get('created'));
            }
        }, {
            key: "users",
            label: "# of Users",
            filter: function(item1, asc, item2){
                var total1 = item1.get('editors').length + item1.get('viewers').length;
                var total2 = item2.get('editors').length + item2.get('viewers').length;
                return (asc)? total1 < total2 : total1 > total2 ;
            }
        },
    ],

    apply_filter: function(){
        this.$("#admin_channel_search").val("");
        if(this.admin_list) {
            this.admin_list.remove();
            delete this.admin_list;
        }
        this.admin_list = new ChannelList({ collection: this.get_filtered_result() });
        this.$("#admin_channel_table_wrapper").html(this.admin_list.el);
    },
    check_search: function(item, text, re) {
        return item.get('name').match(re) || item.id.startsWith(text);
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


var ChannelItem = BaseAdminItem.extend({
    template: require("./hbtemplates/channel_item.handlebars"),
    className: "data_row row",
    tagName:"div",
    events: {
        "click .copy_id": "copy_id"
    },
    copy_id: function(){
        this.$(".channel_id").focus();
        this.$(".channel_id").select();
        try {
            document.execCommand("copy");
            this.$(".copy_id .glyphicon").removeClass("glyphicon-copy").addClass("glyphicon-ok");
          } catch(e) {
              this.$(".copy_id .glyphicon").removeClass("glyphicon-copy").addClass("glyphicon-remove");
          }
          setTimeout(function(){
            this.$(".copy_id .glyphicon").removeClass("glyphicon-ok").removeClass("glyphicon-remove").addClass("glyphicon-copy");
        }, 2500);
    }
});

var UserTab = BaseAdminTab.extend({
    template: require("./hbtemplates/user_tab.handlebars"),
    selected_users: [],
    search_selector: "#admin_user_search",
    filters: [
        {
            key: "all",
            label: "All",
            selected: true,
            filter: function(item){ return true; }
        }, {
            key: "activated",
            label: "Active",
            filter: function(item){ return item.get('is_active'); }
        }, {
            key: "not_activated",
            label: "Inactive",
            filter: function(item){ return !item.get('is_active'); }
        }, {
            key: "admins",
            label: "Admins",
            filter: function(item){ return item.get('is_admin'); }
        }
    ],
    sort_filters: [
        {
            key: "email",
            label: "Email",
            selected: true,
            filter: function(item1, asc, item2){
                return (asc) ?
                    item1.get('email').localeCompare(item2.get('email')) :
                    -item1.get('email').localeCompare(item2.get('email'));
            }
        }, {
            key: "first_name",
            label: "First Name",
            filter: function(item1, asc, item2){
                return (asc) ?
                    item1.get('first_name').localeCompare(item2.get('first_name')) :
                    -item1.get('first_name').localeCompare(item2.get('first_name'));
            }
        }, {
            key: "last_name",
            label: "Last Name",
            filter: function(item1, asc, item2){
                return (asc) ?
                    item1.get('last_name').localeCompare(item2.get('last_name')) :
                    -item1.get('last_name').localeCompare(item2.get('last_name'));
            }
        }, {
            key: "date_joined",
            label: "Date Joined",
            filter: function(item, asc){
                return (asc)? new Date(item.get('date_joined')) : -new Date(item.get('date_joined'));
            }
        }, {
            key: "channels",
            label: "# of Channels",
            filter: function(item1, asc, item2){
                var total1 = item1.get('editable_channels').length;
                var total2 = item2.get('editable_channels').length;
                return (asc)? total1 < total2 : total1 > total2 ;
            }
        },
    ],
    apply_filter: function(){
        this.$("#admin_user_search").val("");
        this.selected_users = [];
        if(this.admin_list) {
            this.admin_list.remove();
            delete this.admin_list;
        }
        this.admin_list = new UserList({ collection: this.get_filtered_result() });
        this.$("#admin_user_table_wrapper").html(this.admin_list.el);
    },
    check_search: function(item, text, re) {
        return item.get('first_name').match(re) || item.get('last_name').match(re) || item.get('email').match(re);
    },
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
