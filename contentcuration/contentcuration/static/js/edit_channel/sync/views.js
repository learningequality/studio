var Backbone = require("backbone");
var _ = require("underscore");
var BaseViews = require("edit_channel/views");
var Models = require("edit_channel/models");
require("sync.less");

/*********** MODAL CONTAINER FOR MOVE OPERATION ***********/
var SyncModalView = BaseViews.BaseModalView.extend({
    template: require("./hbtemplates/sync_modal.handlebars"),
    modal: true,

    initialize: function(options) {
        this.render(this.close, {});
        this.move_view = new SyncView({
            el: this.$(".modal-body"),
            onsync: options.onsync,
            collection : options.collection,
            modal : this,
            model:this.model
        });
    }
});

/*********** VIEW FOR MOVE OPERATION ***********/
var SyncView = BaseViews.BaseListView.extend({
    template: require("./hbtemplates/sync_dialog.handlebars"),
    onsync:null,
    lists: [],

    initialize: function(options) {
        _.bindAll(this, 'sync_content');
        this.modal = options.modal;
        this.onsync = options.onsync;
        this.collection = new Models.ContentNodeCollection();
        this.changed_collection = new Models.ContentNodeCollection();
        this.selected_collection = new Models.ContentNodeCollection();
        this.render();
    },
    events: {
      "click #sync_content_button" : "sync_content"
    },
    close_sync:function(){
        (this.modal)? this.modal.close() : this.remove();
    },

    /*********** LOADING METHODS ***********/
    render: function() {
        var self = this;
        this.$el.html(this.template());
        window.current_channel.get_node_diff().then(function(difference){
            self.collection = difference.original;
            self.changed_collection = difference.changed;

            self.synclist = new SyncList({
                el: self.$("#changed_list_area"),
                collection: self.collection,
                changed: self.changed_collection,
                container: self
            });
            self.preview = new SyncPreviewView({
                el: self.$("#sync_preview_section"),
                model: null,
                changed: null
            });
        });

    },

    /*********** SYNCING METHODS ***********/
    sync_content:function(){
        var self = this;
        this.display_load("Syncing Content...", function(resolve, reject){
            self.collection.sync().then(function(synced){
                self.onsync(synced);
                self.close_sync();
            }).catch(reject);
        });
    },
    handle_selection: function(){
        this.selected_collection.reset(_.chain(this.synclist.views).where({checked : true}).pluck('model').value());
        if(this.selected_collection.length){
            this.$("#sync_content_button").prop("disabled", false);
            this.$("#sync_content_button").removeClass("disabled");
            this.$("#sync_status").text("Syncing " + this.selected_collection.length + (this.selected_collection.length===1? " item..." : " items..."));
        } else {
            this.$("#sync_content_button").prop("disabled", true);
            this.$("#sync_content_button").addClass("disabled");
            this.$("#sync_status").text("");
        }
    },
    set_selected(model){
        this.preview.set_selected(model);
    }
});

var SyncPreviewView = BaseViews.BaseView.extend({
    template: require("./hbtemplates/sync_preview.handlebars"),

    initialize: function(options) {
        this.changed = options.changed;
        this.render();
    },
    /*********** LOADING METHODS ***********/
    render: function() {
        this.$el.html(this.template({
            'node': this.model && this.model.toJSON(),
            'changed': this.changed && this.changed.toJSON()
        }));
    },
    set_selected: function(selected_item){
        this.model = selected_item;
        this.render();
    }
});


/*********** VIEW FOR SYNC LIST ***********/
var SyncList = BaseViews.BaseListView.extend({
    template: require("./hbtemplates/sync_list.handlebars"),
    default_item:".sync-list .default-item",
    list_selector: ".sync-list",
    initialize: function(options) {
        this.container = options.container;
        this.collection = options.collection;
        this.render();
    },
    render: function() {
        this.$el.html(this.template({ node : this.model }));
        this.load_content();
    },
    create_new_view:function(model){
        var new_view = new SyncItem({
            container: this.container,
            containing_list_view : this,
            model : model
        });
        this.views.push(new_view);
        return new_view;
    },

});

/*********** ITEM TO MOVE OR DESTINATION ITEM ***********/
var SyncItem = BaseViews.BaseListNodeItemView.extend({
    template: require("./hbtemplates/sync_list_item.handlebars"),
    tagName: "li",
    className: "sync_list_item",
    selectedClass: "sync-selected",

    'id': function() {
        return "sync_item_" + this.model.get("id");
    },

    initialize: function(options) {
        _.bindAll(this, "render");
        this.bind_node_functions();
        this.containing_list_view = options.containing_list_view;
        this.container = options.container;
        this.checked = false;
        this.render();
    },
    events: {
        'change .sync_checkbox' : 'handle_checked',
        'click .sync_item' : 'set_selected'
    },
    render: function() {
        this.$el.html(this.template({
            node:this.model && this.model.toJSON(),
            isfolder: this.model && this.model.get("kind") === "topic"
        }));
    },
    handle_checked:function(event){
        this.checked = this.$(".sync_checkbox").is(":checked");
        this.container.handle_selection();
    },
    set_selected: function(event){
        this.container.set_selected(this.model);
    }
});

module.exports = {
    SyncModalView: SyncModalView,
    SyncView:SyncView
}
