var Backbone = require("backbone");
var Models = require("../edit_channel/models");
var _ = require("underscore");
require("admin.less");
var BaseViews = require("../edit_channel/views");
var dialog = require("../edit_channel/utils/dialog");
var stringHelper = require("../edit_channel/utils/string_helper");
var fileDownload = require("jquery-file-download");
var AdminRouter = require("./router")

function scopeEvents(events, scopeSuffix){
    // adds a suffix to backbone event selectors (i.e. a class)
    events = JSON.parse(JSON.stringify(events))
    let scopeEvents = {}
    for (let k in events){
        scopeEvents[k+scopeSuffix] = events[k]
    }
    return events
}

var AdminView = BaseViews.BaseView.extend({
    lists: [],
    template: require("./hbtemplates/admin_area.handlebars"),
    initialize: function(options) {
        this.router = options.router;
        this.render();
    },
    render: function() {
        this.$el.html(this.template())

        this.user_collection = new Models.UserCollection();
        this.user_collection.filterOptions = AdminRouter.USER_FILTERS;
        this.user_collection.sortFilterOptions = AdminRouter.USER_SORT_FILTERS;
        this.user_collection.sortOrderOptions = AdminRouter.SORT_ORDER_OPTIONS;

        this.listenTo(this.user_collection, 'sync', (e) => {
            this.$("#user_count").text(this.user_collection.state.totalRecords);
        })

        this.channel_collection = new Models.ChannelCollection();
        this.channel_collection.filterOptions = AdminRouter.CHANNEL_FILTERS;
        this.channel_collection.sortFilterOptions = AdminRouter.CHANNEL_SORT_FILTERS;
        this.channel_collection.sortOrderOptions = AdminRouter.SORT_ORDER_OPTIONS;

        this.listenTo(this.channel_collection, 'sync', (e) => {
            this.$("#channel_count").text(this.channel_collection.state.totalRecords);
        })

        this.user_tab = new UserTab({
            router: this.router,
            collection: this.user_collection,
            el: this.$("#users")
        });
        this.user_tab = new ChannelTab({
            router: this.router,
            collection: this.channel_collection,
            el: this.$("#channels")
        });
    }
});

var BaseAdminTab = BaseViews.BaseListView.extend({
    search_selector: "",
    tab_count_selector: "",
    item_name: "",
    filters: [],
    sort_filters: [],
    extra_filters: [],
    fetch: (e) => {}, // to be overridden
    initialize: function(options) {
        _.bindAll(this, "handle_removed")
        this.collection = options.collection;
        this.router = options.router;
        this.count = this.collection.length;
        this.total_count = this.collection.state.totalRecords;
        this.listenTo(this.collection, 'sync', (e) => {
            this.render()

            // on the next frame, add the 'loaded' class to fade in the table
            window.requestAnimationFrame((e) => this.$('.admin_table').addClass('loaded'))
        })
        this.listenTo(this.collection, 'request', (e) => {
            this.$('.admin_table').removeClass('loaded')
        })
        this.render()
        this.fetch();
    },
    goto_page: function(e){
        let page = $(e.currentTarget).data('page')
        this.router.gotoPage(page)
    },
    goto_previous: function(){
        this.router.gotoPreviousPage()
    },
    goto_next: function(){
        this.router.gotoNextPage();
    },
    handle_removed: function(){
        this.update_count(this.count - 1);
    },
    update_count: function(count){
        this.count = count;
        $(this.tab_count_selector).text(this.collection.state.totalRecords);
        this.$(".viewing_count").text("Displaying " + count + " of " + this.collection.state.totalRecords + " " + this.item_name + "(s)...");
    },
    render: function(load_list=true) {
        this.$el.html(this.template({
            filterOptions: this.collection.filterOptions,
            sortFilterOptions: this.collection.sortFilterOptions,
            sortOrderOptions: this.collection.sortOrderOptions,
            collectionState: this.collection.state,
            total: this.collection.state.totalRecords,
            current_page: this.collection.state.currentPage,
            pages: Array(this.collection.state.totalPages).fill().map((_, i) => {
                return {
                    current_page: i+1 == this.collection.state.currentPage,
                    page_number: i+1
                }
            }),
            disable_previous_page_button: this.collection.state.currentPage == 1,
            disable_next_page_button: 
                this.collection.state.currentPage == this.collection.state.totalPages ||
                !this.collection.state.totalPages,
        }));
        if(load_list) {
            this.load_list();
        }
    },
    check_all: function(event){ this.admin_list.check_all(event); },

    applyFilter: function(e) {
        this.router.gotoRouteForParams({filter: e.target.selectedOptions[0].value, page: 1})
    },
    applySortOrder(e){
        this.router.gotoRouteForParams({sortOrder: e.target.selectedOptions[0].value})
    },
    applySortKey(e){
        this.router.gotoRouteForParams({sortKey: e.target.selectedOptions[0].value})
    },
    applySearch: function(e){
        this.router.gotoRouteForParams({search: e.target.value, page: 1})
    },
    
    /* Implement in subclasses */
    load_list: function() { },
    check_search: function(item) { return false; },
    handle_checked: function() { },
    download_pdf: function() {},
});

const BASE_TAB_EVENTS = {
    // "click": "apply_filter",
    "change .filter_input.view_input" : "applyFilter",
    "change .filter_input.sort_input" : "applySortKey",
    "change .filter_input.order_input" : "applySortOrder",
    "change .search_input" : "applySearch",
    // "paste .search_input" : "applySearch",
    "change #admin_user_select_all" : "check_all",
    "click .download_pdf": "download_pdf",
    "click .page-link.page": "goto_page",
    "click .page-link.previous": "goto_previous",
    "click .page-link.next": "goto_next",
}

var BaseAdminList = BaseViews.BaseListView.extend({
    list_selector: ".admin_table",
    default_item: ".admin_table .default-item",
    initialize: function(options) {
        this.collection = options.collection;
        this.container = options.container;
        this.listenTo(this.collection, 'sync', (e) => {
            this.render()
        });
        this.render();
    },
    render: function() {
        this.$el.html(this.template());
        this.load_content();
    },
});

var BaseAdminItem = BaseViews.BaseListNodeItemView.extend({
    className: "data_row grid_row",
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
    events: scopeEvents(BASE_TAB_EVENTS, ".channels"),
    search_selector: "#admin_channel_search",
    tab_count_selector: "#channel_count",
    item_name: "channel",
    load_list: function(){
        if(this.admin_list) {
            this.admin_list.remove();
            delete this.admin_list;
        }
        this.admin_list = window.channel_list = new ChannelList({
            el: this.$("#admin_channel_table_wrapper"),
            collection: this.collection,
            container: this
        });
    },
    check_search: function(item, text, re) {
        return item.get("name").match(re) || item.id.startsWith(text);
    },
    download_pdf: function() {
        var self = this;
        if(!this.$(".download_pdf").hasClass("disabled")) {
            this.$(".download_pdf").text("Generating PDF...").addClass("disabled");
            $.fileDownload(window.Urls.download_channel_pdf(), {
                successCallback: function(url) {
                    self.$(".download_pdf").text("Download PDF").removeClass("disabled");
                },
                failCallback: function(responseHtml, url) {
                    self.$(".download_pdf").text("Download Failed");
                    setTimeout(function() {
                        self.$(".download_pdf").text("Download PDF").removeClass("disabled");
                    }, 1500);
                }
            });
        }
    }
});


var ChannelList = BaseAdminList.extend({
    template: require("./hbtemplates/channel_list.handlebars"),
    list_selector:".admin_table.channel_list",
    default_item:".channel_list .default-item",
    fetch: function(){
        this.channel_collection.fetch();
    },
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
    className: "data_row grid_row",
    tagName:"div",
    set_attributes: function() {
        _.bindAll(this, 'fetch_editors');
        this.model.set("can_edit", _.find(this.model.get("editors"), function(editor) { return editor.id === window.current_user.id; }));
        this.model.set("editors", _.sortBy(this.model.get("editors"), "first_name"));
        this.model.set("viewers", _.sortBy(this.model.get("viewers"), "first_name"));
    },
    events: {
        "click .copy_id": "copy_id",
        "click .restore_button": "restore_channel",
        "click .private_button": "make_public",
        "click .public_button": "make_private",
        "click .delete_button": "delete_channel",
        "click .count_link": "load_counts",
        "click .search_for_channel_editors": "search_for_channel_editors",
        "change .channel_priority": "set_priority",
        "click .invite_button": "open_sharing",
        "click .download_csv": "download_csv"
    },
    search_for_channel_editors: function() {
        Backbone.history.navigate("/users/search/"+`${this.model.get('name')} ${this.model.get('id')}`, {trigger: true})
    },
    download_csv: function() {
        var self = this;
        if(!this.$(".download_csv").hasClass("disabled")) {
            this.$(".download_csv").attr("title", "Generating CSV...").addClass("disabled");
            $.get({
                url: window.Urls.download_channel_content_csv(this.model.id),
                success: function() {
                    dialog.alert("Generating Channel CSV", "Channel csv generation started. You'll receive an email with the csv when it's done.");
                    self.$(".download_csv").attr("title", "Download CSV").removeClass("disabled");
                },
                error: function(error) {
                    self.$(".download_csv").attr("title", "Download Failed");
                    setTimeout(function() {
                        self.$(".download_csv").attr("title", "Download CSV").removeClass("disabled");
                    }, 2000);
                }
            });
        }
    },
    set_priority: function() {
        var priority = this.$(".channel_priority").val();
        this.model.set_priority(priority);
    },
    load_counts: function(){
        if(this.counts && this.size){
            this.$(".counts_popover").html(this.count_template({counts: this.counts, size: this.size}));
        } else {
            var self = this;
            this.model.get_channel_counts().then(function(counts){
                self.counts = counts.counts;
                self.size = counts.size;
                self.$(".counts_popover").html(self.count_template({counts: self.counts, size: self.size}));
            });
        }
    },
    open_sharing:function(){
        var ShareViews = require("edit_channel/share/views");
        var share_view = new ShareViews.ShareModalView({
            model:this.model,
            current_user: window.current_user,
            allow_leave: true,
            onjoin: this.fetch_editors,
            onleave: this.fetch_editors
        });
    },
    fetch_editors: function(editor){
        // Fetch editors again
        var self = this;
        this.model.fetch_editors().then(function() {
            self.render();
        });
    },
    copy_id: function(){
        this.$(".channel_id").focus();
        this.$(".channel_id").select();
        try {
            document.execCommand("copy");
            this.$(".copy_id i").text("check");
          } catch(e) {
                this.$(".copy_id i").text("clear");
          }
          setTimeout(function(){
            this.$(".copy_id i").text("content_paste");
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
    }
});

let userTabEvents = scopeEvents(BASE_TAB_EVENTS, ".users")
userTabEvents['click #email_selected_users'] = 'email_selected'
var UserTab = BaseAdminTab.extend({
    template: require("./hbtemplates/user_tab.handlebars"),
    selected_users: [],
    search_selector: "#admin_user_search",
    tab_count_selector: "#user_count",
    item_name: "user",
    events: userTabEvents,
    load_list: function(){
        // this.$("#admin_user_search").val("");
        this.selected_users = [];
        if(this.admin_list) {
            this.admin_list.remove();
            delete this.admin_list;
        }
        this.admin_list = window.user_list = new UserList({
            el: $("#admin_user_table_wrapper"),
            collection: this.collection,
            container: this
        });
        this.handle_checked();
        this.$(".select_all").attr("checked", false);
    },
    check_search: function(item, text, re) {
        return item.get("first_name").match(re) || item.get("last_name").match(re) || item.get("email").match(re);
    },
    handle_checked: function() {
        this.selected_users = _.chain(this.admin_list.views).where({checked: true}).pluck("model").value();
        if(this.selected_users.length) {
            this.$("#email_selected_users").removeAttr("disabled").removeClass("disabled");
            this.$(".email_button_text").text("Email " + stringHelper.format_count("User", this.selected_users.length));
        } else {
            this.$("#email_selected_users").attr("disabled", "disabled").addClass("disabled");
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
    list_selector:".admin_table.user_list",
    default_item:".user_list .default-item",
    fetch: function(){
        this.user_collection.fetch()
    },
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
        "click .delete_button": "delete_user",
        "click .deactivate_button": "deactivate_user",
        "click .search_users_editable_channels": "search_users_editable_channels",
        "change .size_limit": "set_user_space",
        "change .size_unit": "set_user_space",
    },
    set_attributes: function() {
        this.model.set("editable_channels", _.sortBy(this.model.get("editable_channels"), "name"));
        this.model.set("view_only_channels", _.sortBy(this.model.get("view_only_channels"), "name"));
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
                "view_only_channels": view_channels
            });
            self.render();
        });
    },
    activate_user: function(){
        this.submit_change({is_active: true}, "Activating User...");
    },
    deactivate_user: function(){
        var self = this;
        dialog.dialog("Deactivating User", "Deactivating this user will block them from using this account. Are you sure you want to continue?", {
          "CANCEL":function(){},
          "DEACTIVATE USER": function(){
            self.submit_change({is_active: false}, "Deactivating User...");
          }
        }, null);
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
    },
    set_user_space: function() {
        var self = this;
        var model = this.model;
        var size = self.$(".size_limit").val() || this.model.get("disk_space");
        var size_unit = Number(self.$(".size_unit").val());
        _.defer(function(){
            model.save({"disk_space": Number(size) * size_unit}, {patch: true}); // Need to convert to bytes
        }, 1000)
    },
    search_users_editable_channels: function() {
        Backbone.history.navigate("/channels/search/"+`${this.model.get('first_name')} ${this.model.get('last_name')} ${this.model.get('email')}`, {trigger: true})
    }
});


var EmailModalView = BaseViews.BaseModalView.extend({
    template: require("./hbtemplates/email_modal.handlebars"),

    initialize: function(options) {
        _.bindAll(this, "close_modal");
        this.collection = options.collection
        this.render(this.close_modal, {
            sender: window.default_sender,
            users: this.collection.toJSON(),
            placeholders: window.email_placeholders
        });
        this.$("[data-toggle='tooltip']").tooltip();
    },
    events: {
        "keydown #message_area": "resize_box",
        "keyup #message_area": "validate",
        "keyup #subject_field": "validate",
        "click #send_button": "send_email",
        "click .email_selected": "toggle_dropdown",
        "click .close_dropdown": "close_dropdown",
        "click .placeholder": "insert_placeholder",
        "click .placeholder": "insert_placeholder",
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
    },
    toggle_dropdown: function(event) {
        var element = this.$($(event.target).data('toggle'));
        if(!element.is(":visible")) {
            this.$(".email_dropdown").css("display", "none");
            element.slideDown(100);
        }
    },
    close_dropdown: function(){
        this.$(".email_dropdown").slideUp(100);
    },
    insert_placeholder: function(event) {
        this.$("#message_area").val(this.$("#message_area").val() + event.target.dataset.val);
        this.$("#message_area").focus();
    }
});


module.exports = {
    AdminView: AdminView
}
