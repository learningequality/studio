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
        this.collection = options.collection;
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
        this.$el.html(this.template());
        this.preview = new SyncPreviewView({
            el: this.$("#sync_preview_section"),
            model: new Models.ContentNodeModel(),
            changed: new Models.ContentNodeModel()
        })
    },

    /*********** MOVING METHODS ***********/
    sync_content:function(){
        var self = this;
        this.display_load("Syncing Content...", function(resolve, reject){
            self.collection.sync().then(function(synced){
                self.onsync(synced);
                self.close_sync();
            }).catch(reject);
        });
    },
    handle_target_selection:function(node){
        // Set node to move items to
        this.$("#move_content_button").prop("disabled", false);
        this.$("#move_content_button").removeClass("disabled");
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
        this.$el.html(this.template({'node': this.model.toJSON(), 'changed': this.changed.toJSON()}));
    },
    set_selected: function(selected_item){
        this.model = selected_item;
        this.render();
    }
});


/*********** VIEW FOR MOVE LISTS (SOURCE AND DESTINATION) ***********/
var MoveList = BaseViews.BaseListView.extend({
    template: require("./hbtemplates/move_list.handlebars"),
    default_item:">.default-item",
    list_selector: ">.move-list",
    initialize: function(options) {
        this.is_target = options.is_target;
        this.container = options.container;
        this.collection = options.collection;
        this.render();
    },
    render: function() {
        this.$el.html(this.template({
            node : this.model,
            is_target:this.is_target
        }));
        this.load_content();
    },
    create_new_view:function(model){
        var new_view = new MoveItem({
            container: this.container,
            containing_list_view : this,
            model : model,
            is_target : this.is_target
        });
        this.views.push(new_view);
        return new_view;
    }
});

/*********** ITEM TO MOVE OR DESTINATION ITEM ***********/
var MoveItem = BaseViews.BaseListNodeItemView.extend({
    template: require("./hbtemplates/move_list_item.handlebars"),
    tagName: "li",
    className: "move_list_item",
    selectedClass: "move-selected",
    collapsedClass: "glyphicon-triangle-top",
    expandedClass: "glyphicon-triangle-bottom",
    list_selector: ">.move-list",

    getToggler: function () { return this.$("#menu_toggle_" + this.model.id); },
    getSubdirectory: function () {return this.$("#" + this.id() +"_sub"); },
    'id': function() {
        return "move_item_" + this.model.get("id");
    },

    initialize: function(options) {
        _.bindAll(this, "render");
        this.bind_node_functions();
        this.containing_list_view = options.containing_list_view;
        this.is_target = options.is_target;
        this.container = options.container;
        this.collection = new Models.ContentNodeCollection();
        this.render();
    },
    events: {
        'dblclick .dblclick_toggle' : 'toggle',
        'click .tog_folder' : 'toggle',
        'change >.move_checkbox' : 'handle_checked'
    },
    render: function() {
        var has_descendants = this.model.get('metadata').resource_count < this.model.get('metadata').total_count;
        this.$el.html(this.template({
            node:this.model.toJSON(),
            isfolder: this.model.get("kind") === "topic",
            is_target:this.is_target,
            has_descendants: (this.is_target)? has_descendants : this.model.get("children").length
        }));
    },
    load_subfiles:function(){
        var self = this;
        var filter_ids = this.container.to_move_ids
        this.collection.get_all_fetch(this.model.get('children')).then(function(fetched){
            var nodes = fetched.filter(function(n) {
                return !self.is_target || (n.get('kind') === 'topic' && !_.contains(filter_ids, n.id));
            });
            self.subcontent_view = new MoveList({
                model: self.model,
                el: $(self.getSubdirectory()),
                is_target: self.is_target,
                collection: new Models.ContentNodeCollection(_.pluck(nodes, 'attributes')),
                container: self.container
            });
        });
    },
    handle_checked:function(event){
        this.container.handle_target_selection(this.model);
    }
});

module.exports = {
    SyncModalView: SyncModalView,
    SyncView:SyncView
}