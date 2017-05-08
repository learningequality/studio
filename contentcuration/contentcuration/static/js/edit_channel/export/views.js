var Backbone = require("backbone");
var _ = require("underscore");
var BaseViews = require("edit_channel/views");
var Models = require("edit_channel/models");
var stringHelper = require("edit_channel/utils/string_helper");
require("export.less");

var ExportModalView = BaseViews.BaseModalView.extend({
    template: require("./hbtemplates/export_modal.handlebars"),
    initialize: function(options) {
        _.bindAll(this, "publish", 'loop_focus');
        this.modal = true;
        this.render(this.close, {
            channel: window.current_channel.toJSON(),
            licenses: window.licenses.toJSON(),
            version: window.current_channel.get("version") + 1,
            node: this.model.toJSON(),
        });
        this.onpublish = options.onpublish;
        this.export_view = new ExportListView({
            el: this.$("#export_preview"),
            container: this,
            model: this.model,
            onpublish:this.onpublish
        });
        this.listenTo(this.export_view, "loadFinish", function(){
            $("#publish_btn").focus();
        });
        var self = this;
        this.model.calculate_size().then(function(size){
            self.$("#export_size").text("(" + stringHelper.format_size(size) + ")");
        });
    },
    events:{
      "click #publish_btn" : "publish",
      'focus .input-tab-control': 'loop_focus'
    },
    publish:function(){
        var self = this;
        this.display_load("Publishing...", function(resolve, reject){
            window.current_channel.publish().then(function(){
                self.onpublish(window.workspace_manager.get_published_collection());
                self.close();
                resolve("Success!");
            }).catch(function(error){
                reject(error);
            });
        });
    }
});

var ExportListView = BaseViews.BaseListView.extend({
    template: require("./hbtemplates/export_list.handlebars"),
    default_item:">.export_list >.default-item",
    list_selector: ">.export_list",

    initialize: function(options) {
        this.collection = new Models.ContentNodeCollection();
        this.container = options.container;
        this.render();
    },

    render: function() {
        this.$el.html(this.template({id: this.model.get("id")}));
        var self = this;
        this.fetch_model(this.model).then(function(fetched){
            self.collection.get_all_fetch_simplified(fetched.get("children")).then(function(fetchedCollection){
                self.load_content(fetchedCollection);
                self.trigger('loadFinish');
            });
        })

    },
    create_new_view:function(model){
        var export_item = new ExportItem({
            model: model,
            containing_list_view : this,
            container: this.container
        });
        this.views.push(export_item);
        return export_item;
    }
});

var ExportItem = BaseViews.BaseListNodeItemView.extend({
    template: require("./hbtemplates/export_item.handlebars"),
    className: "export_item",
    selectedClass: "export-selected",
    collapsedClass: "glyphicon-menu-right",
    expandedClass: "glyphicon-menu-down",
    list_selector: ">.export_list",
    item_to_import: false,

    getToggler: function () { return this.$("#menu_toggle_" + this.model.id); },
    getSubdirectory: function () {return this.$("#" + this.id() +"_sub"); },
    'id': function() {
        return "export_item_" + this.model.get("id");
    },

    initialize: function(options) {
        this.bind_node_functions();
        this.container = options.container;
        this.containing_list_view = options.containing_list_view;
        this.render();
    },
    events:{
      "click .export_folder" : "toggle"
    },
    render: function() {
        this.$el.html(this.template({
            node: this.model.toJSON(),
            isfolder: this.model.get("kind") === "topic",
            isempty:this.model.get("children").length ===0
        }));
    },
    load_subfiles:function(){
        var data = {
            model : this.model,
            el: $(this.getSubdirectory()),
            container: this.container
        }
        this.subcontent_view = new ExportListView(data);
    },
});

module.exports = {
    ExportModalView:ExportModalView,
    ExportListView:ExportListView
}