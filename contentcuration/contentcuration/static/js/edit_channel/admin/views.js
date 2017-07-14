var Backbone = require("backbone");
var Models = require("edit_channel/models");
var _ = require("underscore");
require("admin.less");
var BaseViews = require("edit_channel/views");
var dialog = require("edit_channel/utils/dialog");
var stringHelper = require("edit_channel/utils/string_helper");

var AdminView = BaseViews.BaseView.extend({
    lists: [],
    template: require("./hbtemplates/admin_area.handlebars"),
    initialize: function(options) {
        this.render();
    },
    render: function() {
        this.$el.html(this.template())
        this.channel_collection = new Models.ChannelCollection();
        this.users_collection = new Models.UserCollection();

        var self = this;
        this.channel_collection.get_all_channels().then(function(collection){
            self.$("#channel_count").text(collection.length);
            self.channel_list = new ChannelTab({
                collection:collection,
                el: self.$("#admin_channels")
            });
        });

        this.users_collection.get_all_users().then(function(collection){
            self.$("#user_count").text(collection.length);
            self.user_list = new UserTab({
                collection:collection,
                el: self.$("#admin_users")
            });
        });
    }
});

var BaseAdminTab = BaseViews.BaseListView.extend({
    search_selector: "",
    tab_count_selector: "",
    filters: [],
    sort_filters: [],
    extra_filters: [],

    initialize: function(options) {
        _.bindAll(this, "handle_removed")
        this.collection = options.collection;
        this.extra_filters = this.get_dynamic_filters();
        this.count = this.collection.length;
        this.render();
        this.listenTo(this.collection, "remove", this.handle_removed);
    },
    events: {
        "change .filter_input" : "apply_filter",
        "keyup .search_input" : "apply_search",
        "paste .search_input" : "apply_search",
        "change .select_all" : "check_all",
    },
    handle_removed: function(){
        this.update_count(this.count - 1);
    },
    update_count: function(count){
        this.count = count;
        $(this.tab_count_selector).text(count);
    },
    render: function() {
        this.$el.html(this.template({
            filters: this.filters,
            sort_filters: this.sort_filters,
            extra_filters: this.extra_filters
        }));
        this.apply_filter();
    },
    check_all: function(event){ this.admin_list.check_all(event); },
    get_filtered_result: function(){
        var asc = this.$(".order_input").val() === "ascending";
        var filter = _.findWhere(this.filters, {"key": this.$(".view_input").val()}).filter;
        var sort = _.findWhere(this.sort_filters, {"key": this.$(".sort_input").val()}).filter;

        var extra = this.$(".extra_input").val();
        var extra_filter =_.findWhere(this.extra_filters, {"key": extra}).filter;

        var filtered_list = this.collection.chain().filter(filter)
                                .filter(function(item) { return extra_filter(item, extra); })
                                .value();
        var filtered_collection = new Models.ContentNodeCollection(filtered_list);
        filtered_collection.set_comparator(function(item1, item2){return sort(item1, asc, item2);});
        filtered_collection.sort();
        this.update_count(filtered_collection.length);
        return filtered_collection;
    },
    get_search_result: function(text){
        var q = this.check_search;
        var text = this.$(this.search_selector).val().trim().toLowerCase();
        var re = new RegExp(text, "i");
        return this.collection.chain()
            .filter(function(item) {return q(item, text, re);})
            .pluck("id").value();
    },
    apply_search: function() {
        var self = this;
        _.defer(function(){
            var matches = self.get_search_result();
            var count = self.admin_list.apply_search(matches);
            self.update_count(count);
        }, 500);
    },

    /* Implement in subclasses */
    apply_filter: function() { },
    check_search: function(item) { return false; },
    handle_checked: function() { },
    get_dynamic_filters: function() { return []; }
});

var BaseAdminList = BaseViews.BaseListView.extend({
    list_selector: ".admin_table",
    default_item: ".admin_table .default-item",

    initialize: function(options) {
        this.collection = options.collection;
        this.container = options.container;
        this.render();
    },
    render: function() {
        this.$el.html(this.template());
        this.load_content();
    },
    apply_search: function(matches){
        var total = 0;
        _.each(this.views, function(view){
            var is_match = _.contains(matches, view.model.id);
            view.$el.css("display", (is_match) ? "block" : "none");
            total += (is_match) ? 1 : 0;
        });
        return total;
    }
});

var BaseAdminItem = BaseViews.BaseListNodeItemView.extend({
    className: "data_row row",
    tagName:"div",

    initialize: function(options) {
        this.containing_list_view = options.containing_list_view;
        this.container = options.container;
        this.set_attributes();
        this.render();
    },
    set_attributes: function() { /* Implement in subclasses */ },
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
    },
    handle_checked:function(){
        this.checked = this.$el.find("input[type=checkbox]").is(":checked");
        this.container.handle_checked();
    },
});


var ChannelTab = BaseAdminTab.extend({
    template: require("./hbtemplates/channel_tab.handlebars"),
    search_selector: "#admin_channel_search",
    tab_count_selector: "#channel_count",
    filters: [
        {
            key: "all",
            label: "All",
            filter: function(item){ return true; }
        }, {
            key: "live",
            label: "Live",
            selected: true,
            filter: function(item){ return !item.get("deleted"); }
        }, {
            key: "published",
            label: "Published",
            filter: function(item){ return item.get("published"); }
        }, {
            key: "public",
            label: "Public",
            filter: function(item){ return item.get("public") && !item.get("deleted"); }
        }, {
            key: "private",
            label: "Private",
            filter: function(item){ return !item.get("public") && !item.get("deleted"); }
        }, {
            key: "can_edit",
            label: "My Channels",
            filter: function(item){ return item.get("can_edit"); }
        }, {
            key: "staged",
            label: "Needs Review",
            filter: function(item){ return item.get("staging_tree"); }
        }, {
            key: "ricecooker",
            label: "Sushi Chef",
            filter: function(item){ return item.get("ricecooker_version"); }
        }, {
            key: "deleted",
            label: "Deleted",
            filter: function(item){ return item.get("deleted"); }
        }
    ],
    sort_filters: [
        {
            key: "name",
            label: "Name",
            selected: true,
            filter: function(item1, asc, item2){
                return (asc) ?
                    item1.get("name").localeCompare(item2.get("name")) :
                    -item1.get("name").localeCompare(item2.get("name"));
            }
        }, {
            key: "id",
            label: "Channel ID",
            filter: function(item1, asc, item2){
                return (asc) ? item1.id.localeCompare(item2.id) : -item1.id.localeCompare(item2.id);
            }
        }, {
            key: "users",
            label: "# of Users",
            filter: function(item1, asc, item2){
                var total1 = item1.get("editors").length + item1.get("viewers").length;
                var total2 = item2.get("editors").length + item2.get("viewers").length;
                return (asc)? total1 - total2 : total2 - total1 ;
            }
        }, {
            key: "items",
            label: "# of Items",
            filter: function(item1, asc, item2){
                var count1 = item1.get("count");
                var count2 = item1.get("count");
                return (asc)? count1 - count2 : count2 - count1;
            }
        }, {
            key: "modified",
            label: "Last Updated",
            filter: function(item1, asc, item2){
                var date1 = new Date(item1.get("modified"));
                var date2 = new Date(item2.get("modified"));
                return (asc)? date1 - date2 : date2 - date1;
            }
        }, {
            key: "created",
            label: "Date Created",
            filter: function(item1, asc, item2){
                var date1 = new Date(item1.get("created"));
                var date2 = new Date(item2.get("created"));
                return (asc)? date1 - date2 : date2 - date1;
            }
        }
    ],
    get_dynamic_filters: function() {
        var filter = [{
            key: "all",
            label: "All Users",
            selected: true,
            filter: function(channel, id) { return true; }
        }];

        return filter.concat(_.chain(this.collection.pluck("editors"))
            .flatten()
            .where({is_active : true})
            .uniq(function(item){ return item.id; })
            .sortBy("first_name")
            .map(function(item){
                return {
                    key: item.id.toString(),
                    label: item.first_name + " " + item.last_name,
                    filter: function(channel, id) {
                        return _.findWhere(channel.get("editors"), {id: Number(id)});
                    }
                }
            }).value());
    },
    apply_filter: function(){
        this.$("#admin_channel_search").val("");
        if(this.admin_list) {
            this.admin_list.remove();
            delete this.admin_list;
        }
        this.admin_list = new ChannelList({
            collection: this.get_filtered_result(),
            container: this
        });
        this.$("#admin_channel_table_wrapper").html(this.admin_list.el);
    },
    check_search: function(item, text, re) {
        return item.get("name").match(re) || item.id.startsWith(text);
    },
});


var ChannelList = BaseAdminList.extend({
    template: require("./hbtemplates/channel_list.handlebars"),
    list_selector:".channel_list",
    default_item:".channel_list .default-item",
    create_new_view:function(model){
        var newView = new ChannelItem({
            model: model,
            containing_list_view:this,
            container: this.container
        });
        this.views.push(newView);
        return newView;
    },
});

var ChannelItem = BaseAdminItem.extend({
    template: require("./hbtemplates/channel_item.handlebars"),
    count_template: require("./hbtemplates/channel_counts.handlebars"),
    className: "data_row row",
    tagName:"div",
    set_attributes: function() {
        this.model.set("can_edit", _.find(this.model.get("editors"), function(editor) { return editor.id === window.current_user.id; }));
    },
    events: {
        "click .copy_id": "copy_id",
        "click .restore_button": "restore_channel",
        "click .private_button": "make_public",
        "click .public_button": "make_private",
        "click .delete_button": "delete_channel",
        "click .join_button": "join_editors",
        "click .count_link": "load_counts",
        "click .leave_button": "leave_editors"
    },
    load_counts: function(){
        if(this.counts){
            this.$(".counts_popover").html(this.count_template({counts: this.counts}));
        } else {
            var self = this;
            this.model.get_channel_counts().then(function(counts){
                self.counts = counts;
                self.$(".counts_popover").html(self.count_template({counts: self.counts}));
            });
        }
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
        }, 2000);
    },
    submit_change: function(data, message){
        var self = this;
        var editors = this.model.get("editors");
        var viewers = this.model.get("viewers");
        this.save(data, message).then(function(model){
            self.model.set({
                "editors": editors,
                "viewers": viewers,
            });
            self.render();
        });
    },
    restore_channel: function() {
        this.submit_change({deleted: false}, "Restoring Channel...");
    },
    make_public: function(){
        var self = this;
        dialog.dialog("Public Access", "Making this channel public will allow all users to view and import from this channel. Make public?", {
          "CANCEL":function(){},
          "MAKE PUBLIC": function(){
              self.submit_change({public: true}, "Making Channel Public...");
          }
        }, null);
    },
    make_private: function(){
        var self = this;
        dialog.dialog("Private Access", "Making this channel private will only be accessible to those with editing or view-only permissions. Make private?", {
          "CANCEL":function(){},
          "MAKE PRIVATE": function(){
              self.submit_change({public: false}, "Making Channel Private...");
          }
        }, null);
    },
    delete_channel: function(){
        var self = this;
        dialog.dialog("Deleting Channel", "Are you sure you want to PERMANENTLY delete this channel and all of its content? Action cannot be undone!", {
          "CANCEL":function(){},
          "DELETE CHANNEL": function(){
            self.container.collection.remove(self.model)
            self.destroy("Deleting Channel...", function(){
                self.remove();
            });
          }
        }, null);
    },
    join_editors: function(){
        var self = this;
        dialog.dialog("Joining Channel", "By joining this channel, you will be listed as an editor and have access to it in your channel list. Continue?", {
          "CANCEL":function(){},
          "JOIN": function(){
                self.$(".join_button").attr("disabled", "disabled").addClass("disabled");
                self.model.add_editor(window.current_user.id).then(function(){
                    self.model.set("can_edit", true);
                    self.model.set("editors", self.model.get("editors").concat(window.current_user.toJSON()));
                    self.render();
                }).catch(function(error){
                    dialog.alert("Action Failed", "Failed to join editors (" + error.responseText + ")");
                });
          }
        }, null);
    },
    leave_editors: function(){
        var self = this;
        dialog.dialog("Leaving Channel", "Leaving this channel will remove it from your channel list. "+
                    "However, you will still be able to edit and join it as an administrator. Continue?", {
          "CANCEL":function(){},
          "LEAVE": function(){
                self.$(".leave_button").attr("disabled", "disabled").addClass("disabled");
                self.model.remove_editor(window.current_user.id).then(function(){
                    self.model.set("can_edit", false);
                    self.model.set("editors", _.reject(self.model.get("editors"), function(user) { return user.id === window.current_user.id }));
                    self.render();
                }).catch(function(error){
                    dialog.alert("Action Failed", "Failed to leave channel (" + error.responseText + ")");
                });
          }
        }, null);
    }
});

var UserTab = BaseAdminTab.extend({
    template: require("./hbtemplates/user_tab.handlebars"),
    selected_users: [],
    search_selector: "#admin_user_search",
    tab_count_selector: "#user_count",
    filters: [
        {
            key: "all",
            label: "All",
            selected: true,
            filter: function(item){ return true; }
        }, {
            key: "activated",
            label: "Active",
            filter: function(item){ return item.get("is_active"); }
        }, {
            key: "not_activated",
            label: "Inactive",
            filter: function(item){ return !item.get("is_active"); }
        }, {
            key: "admins",
            label: "Admins",
            filter: function(item){ return item.get("is_admin"); }
        }
    ],
    sort_filters: [
        {
            key: "email",
            label: "Email",
            selected: true,
            filter: function(item1, asc, item2){
                return (asc) ?
                    item1.get("email").localeCompare(item2.get("email")) :
                    -item1.get("email").localeCompare(item2.get("email"));
            }
        }, {
            key: "first_name",
            label: "First Name",
            filter: function(item1, asc, item2){
                return (asc) ?
                    item1.get("first_name").localeCompare(item2.get("first_name")) :
                    -item1.get("first_name").localeCompare(item2.get("first_name"));
            }
        }, {
            key: "last_name",
            label: "Last Name",
            filter: function(item1, asc, item2){
                return (asc) ?
                    item1.get("last_name").localeCompare(item2.get("last_name")) :
                    -item1.get("last_name").localeCompare(item2.get("last_name"));
            }
        }, {
            key: "date_joined",
            label: "Date Joined",
            filter: function(item1, asc, item2){
                var date1 = new Date(item1.get("date_joined"));
                var date2 = new Date(item2.get("date_joined"));
                return (asc)? date1 - date2 : date2 - date1;
            }
        }, {
            key: "channels",
            label: "# of Channels",
            filter: function(item1, asc, item2){
                var total1 = item1.get("editable_channels").length;
                var total2 = item2.get("editable_channels").length;
                return (asc)? total1 - total2 : total2 - total1 ;
            }
        },
    ],
    events: {
        "change .filter_input" : "apply_filter",
        "keyup .search_input" : "apply_search",
        "paste .search_input" : "apply_search",
        "change .select_all" : "check_all",
        "click #email_selected" : "email_selected"
    },
    get_dynamic_filters: function() {
        var filter = [{
            key: "all",
            label: "All Channels",
            selected: true,
            filter: function(user, id) { return true; }
        }];
        return filter.concat(_.chain(this.collection.pluck("editable_channels"))
            .flatten()
            .uniq(function(item){ return item.id; })
            .sortBy("name")
            .map(function(item){
                return {
                    key: item.id,
                    label: item.name || "Untitled Channel " + item.id,
                    filter: function(user, id) {
                        return _.findWhere(user.get("editable_channels"), {id: id});
                    }
                }
            }).value());
    },
    apply_filter: function(){
        this.$("#admin_user_search").val("");
        this.selected_users = [];
        if(this.admin_list) {
            this.admin_list.remove();
            delete this.admin_list;
        }
        this.admin_list = new UserList({
            collection: this.get_filtered_result(),
            container: this
        });
        this.$("#admin_user_table_wrapper").html(this.admin_list.el);
        this.handle_checked();
        this.$(".select_all").attr("checked", false);
    },
    check_search: function(item, text, re) {
        return item.get("first_name").match(re) || item.get("last_name").match(re) || item.get("email").match(re);
    },
    handle_checked: function() {
        this.selected_users = _.chain(this.admin_list.views).where({checked: true}).pluck("model").value();
        if(this.selected_users.length) {
            this.$("#email_selected").removeAttr("disabled").removeClass("disabled");
            this.$(".email_button_text").text("Email " + stringHelper.format_count("User", this.selected_users.length));
        } else {
            this.$("#email_selected").attr("disabled", "disabled").addClass("disabled");
            this.$(".email_button_text").text("Select Users...");
        }
    },
    email_selected: function() {
        new EmailModalView({
            collection: new Models.UserCollection(this.selected_users)
        })
    },
    send_user_email: function(user){
        new EmailModalView({
            collection: new Models.UserCollection([user])
        })
    }
});

var UserList = BaseAdminList.extend({
    template: require("./hbtemplates/user_list.handlebars"),
    list_selector:".user_list",
    default_item:".user_list .default-item",
    create_new_view:function(model){
        var newView = new UserItem({
            model: model,
            containing_list_view:this,
            container: this.container
        });
        this.views.push(newView);
        return newView;
    },
});

var UserItem = BaseAdminItem.extend({
    template: require("./hbtemplates/user_item.handlebars"),
    events: {
        "click .user_select_checkbox" : "handle_checked",
        "click .email_button" : "send_email",
        "click .activate_button": "activate_user",
        "click .delete_button": "delete_user"
    },
    send_email: function(){
        this.container.send_user_email(this.model);
    },
    submit_change: function(data, message){
        var self = this;
        var edit_channels = this.model.get("editable_channels");
        var view_channels = this.model.get("view_only_channels");
        this.save(data, message).then(function(model){
            self.model.set({
                "editable_channels": edit_channels,
                "view_only_channels": view_channels,
                is_active: true
            });
            self.render();
        });
    },
    activate_user: function(){
        this.submit_change({is_active: false}, "Activating User...");
    },
    delete_user: function(){
        var self = this;
        dialog.dialog("Deleting User", "Are you sure you want to PERMANENTLY delete this user? Action cannot be undone!", {
          "CANCEL":function(){},
          "DELETE USER": function(){
            self.container.collection.remove(self.model)
            self.destroy("Deleting User...", function(){
                self.remove();
            });
          }
        }, null);
    }
});


var EmailModalView = BaseViews.BaseModalView.extend({
    template: require("./hbtemplates/email_modal.handlebars"),

    initialize: function(options) {
        _.bindAll(this, "close_modal");
        this.collection = options.collection
        this.render(this.close_modal, {
            sender: window.default_sender,
            users: this.collection.toJSON()
        });
        this.$("[data-toggle='tooltip']").tooltip();
    },
    events: {
        "keydown #message_area": "resize_box",
        "keyup #message_area": "validate",
        "keyup #subject_field": "validate",
        "click #send_button": "send_email"
    },
    close_modal:function(event){
        if(event && (this.$("#subject_field").val().trim() || this.$("#message_area").val().trim())){
            var self = this;
            dialog.dialog("Draft in Progress", "Draft will be lost upon exiting this editor. Are you sure you want to continue?", {
              "KEEP OPEN":function(){},
              "DISCARD DRAFT": function(){
                  self.close();
                  $(".modal-backdrop").remove();
              }
            }, null);
            this.cancel_actions(event);
        } else {
            this.close();
            $(".modal-backdrop").remove();
        }
    },
    resize_box: function() {
        // console.log()
        // var new_height = Math.max(this.$("#message_area")[0].scrollHeight, 300)
        // this.$("#message_area").autogrow();
    },
    validate: function() {
        var has_subject = this.$("#subject_field").val().trim();
        var has_message = this.$("#message_area").val().trim();
        (has_subject)? this.$("#subject_field").removeClass("error-field") : this.$("#subject_field").addClass("error-field");
        (has_subject && has_message) ?
            this.$("#send_button").removeAttr("disabled").removeClass("disabled") :
            this.$("#send_button").attr("disabled", "disabled").addClass("disabled");
    },
    send_email: function(){
        var subject = this.$("#subject_field").val().trim();
        var message = this.$("#message_area").val();
        var self = this;
        this.collection.send_custom_email(subject, message).then(function(){
            dialog.alert("Message Sent", "Message has been sent!", self.close_modal);
        }).catch(function(error){
            dialog.alert("Message Failed", "Failed to send message (" + error.responseText + ")");
        });
    }
});


module.exports = {
    AdminView: AdminView
}
