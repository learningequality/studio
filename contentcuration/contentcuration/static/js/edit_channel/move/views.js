var Backbone = require("backbone");
var _ = require("underscore");
var BaseViews = require("edit_channel/views");
var Models = require("edit_channel/models");
require("move.less");

/*********** MODAL CONTAINER FOR MOVE OPERATION ***********/
var MoveModalView = BaseViews.BaseModalView.extend({
    template: require("./hbtemplates/move_modal.handlebars"),
    modal: true,

    initialize: function(options) {
        this.render(this.close, {});
        this.move_view = new MoveView({
            el: this.$(".modal-body"),
            onmove: options.onmove,
            collection : options.collection,
            modal : this,
            model:this.model
        });
    }
});

/*********** VIEW FOR MOVE OPERATION ***********/
var MoveView = BaseViews.BaseListView.extend({
    template: require("./hbtemplates/move_dialog.handlebars"),
    onmove:null,
    lists: [],
    target_node:null,

    initialize: function(options) {
        _.bindAll(this, 'move_content');
        this.modal = options.modal;
        this.onmove = options.onmove;
        this.collection = options.collection;

        this.render();
    },
    events: {
      "click #move_content_button" : "move_content"
    },
    close_move:function(){
        (this.modal)? this.modal.close() : this.remove();
    },

    /*********** LOADING METHODS ***********/
    render: function() {
        this.$el.html(this.template());
        this.moveList = new MoveList({
            model : null,
            el:$("#move_list_area"),
            is_target: false,
            collection :  this.collection,
            container :this
        });
        this.load_target_list();
    },
    load_target_list:function(){
        var fetched = new Models.ContentNodeCollection();
        // Add main tree root
        var main_node = this.model.clone();
        main_node.set({'title': window.current_channel.get("name")});
        fetched.add(main_node);

        // Add clipboard node
        var clipboard_node = window.current_user.get_clipboard().clone();
        clipboard_node.set({'title': 'My Clipboard'});
        fetched.add(clipboard_node);

        // Calculate valid moves using node descendants
        var self = this;
        this.collection.get_descendant_ids().then(function(ids){
            self.to_move_ids = ids;

            // Render list
            self.targetList = new MoveList({
                model: null,
                el: $("#target_list_area"),
                is_target: true,
                collection:  fetched,
                container: self
            });
        });
    },

    /*********** MOVING METHODS ***********/
    move_content:function(){
        var self = this;
        this.display_load("Moving Content...", function(resolve, reject){
            var sort_order = self.target_node.get('metadata').max_sort_order;
            var original_parents = self.collection.pluck('parent');
            // Get original parents
            self.collection.move(self.target_node, null, sort_order).then(function(moved){
                self.collection.get_all_fetch(original_parents).then(function(fetched){
                    fetched.add(self.target_node);
                    self.onmove(self.target_node, moved, fetched);
                    self.close_move();
                    resolve(true);
                });
            }).catch(reject);
        });
    },
    handle_target_selection:function(node){
        // Set node to move items to
        this.target_node = node;
        this.$("#move_content_button").prop("disabled", false);
        this.$("#move_content_button").removeClass("disabled");

        // Calculate number of items
        this.$("#move_status").text("Moving " + this.to_move_ids.length +
            ((this.to_move_ids.length === 1)? " item to " : " items to ") +
            this.target_node.get("title")
        );
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
    MoveModalView: MoveModalView,
    MoveView:MoveView
}