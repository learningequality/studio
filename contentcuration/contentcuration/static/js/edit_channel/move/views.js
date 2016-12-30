var Backbone = require("backbone");
var _ = require("underscore");
var BaseViews = require("edit_channel/views");
var Models = require("edit_channel/models");
require("move.less");

var MoveModalView = BaseViews.BaseModalView.extend({
    template: require("./hbtemplates/move_modal.handlebars"),

    initialize: function(options) {
        _.bindAll(this, "close_move");
        this.modal = true;
        this.render(this.close, {});
        this.move_view = new MoveView({
            el: this.$(".modal-body"),
            onmove: this.onmove,
            collection : options.collection,
            modal : this,
            model:this.model
        });
    },
    close_move:function(collection){
      this.onmove(collection);
      this.close();
    }
});


var MoveView = BaseViews.BaseListView.extend({
    template: require("./hbtemplates/move_dialog.handlebars"),
    onmove:null,
    lists: [],
    target_node:null,

    initialize: function(options) {
        _.bindAll(this, 'move_content');
        this.modal = options.modal;
        this.collection = options.collection;
        this.target_collection = this.collection;
        this.onmove = options.onmove;
        this.render();
    },
    events: {
      "click #move_content_button" : "move_content"
    },
    render: function() {
        this.$el.html(this.template({
            is_empty:this.target_collection.length === 0
        }));
        this.moveList = new MoveList({
            model : null,
            el:$("#move_list_area"),
            is_target: false,
            collection :  this.collection,
            container :this
        });
        this.targetList = new MoveList({
            model : null,
            el:$("#target_list_area"),
            is_target: true,
            collection :  this.target_collection,
            container :this
        });
    },
    fetch_target_list:function(){
        return new Models.ContentNodeCollection();
    },
    move_content:function(){
        var self = this;
        console.log("MOVED!")
        // this.display_load("Moving Content...", function(resolve, reject){
        //     self.get_move_collection().duplicate(self.model).then(function(copied){
        //         self.close_mover(copied);
        //         resolve(true);
        //     });
        // });
    },
    close_move:function(collection){
        if(this.modal){
            this.modal.close_move(collection);
        }else{
            this.onmove(collection);
            this.remove();
        }
    },
    handle_target_selection:function(node){
        this.target_node = node;
        this.$("#move_content_button").prop("disabled", false);
        this.$("#move_content_button").removeClass("disabled");
    }
});

var MoveList = BaseViews.BaseListView.extend({
    template: require("./hbtemplates/move_list.handlebars"),
    default_item:">.default-item",
    list_selector: ">.move-list",
    initialize: function(options) {
        this.is_target = options.is_target;
        this.container = options.container;
        this.collection = this.get_collection(options.collection);
        this.render();
    },
    get_collection:function(collection){
        return (this.is_target)? collection.where({kind : "topic"}) : collection;
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
        this.bind_node_functions();
        this.containing_list_view = options.containing_list_view;
        this.is_target = options.is_target;
        this.collection = new Models.ContentNodeCollection();
        this.container = options.container;
        this.render();
    },
    events: {
        'dblclick .dblclick_toggle' : 'toggle',
        'click .tog_folder' : 'toggle',
        'change >.move_checkbox' : 'handle_checked'
    },
    render: function() {
        this.$el.html(this.template({
            node:this.model.toJSON(),
            isfolder: this.model.get("kind") === "topic",
            is_target:this.is_target,
            has_descendants: (this.is_target)? this.model.get("metadata").total_count != this.model.get("metadata").resource_count : this.model.get("children").length > 0
        }));
    },
    load_subfiles:function(){
        var self = this;
        this.collection.get_all_fetch(this.model.get("children")).then(function(fetched){
            self.subcontent_view = new MoveList({
                model : self.model,
                el: $(self.getSubdirectory()),
                is_target: self.is_target,
                collection: fetched,
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