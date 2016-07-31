var Backbone = require("backbone");
var _ = require("underscore");
var BaseViews = require("edit_channel/views");
var Models = require("edit_channel/models");
require("export.less");

var ExportModalView = BaseViews.BaseModalView.extend({
    template: require("./hbtemplates/export_modal.handlebars"),
    license_template: require("./hbtemplates/export_license.handlebars"),

    initialize: function(options) {
        _.bindAll(this, "close_exporter", "publish");
        this.modal = true;
        this.render();
        this.callback = options.callback;
        this.export_view = new ExportListView({
            el: this.$("#export_preview"),
            container: this,
            model: this.model
        });
        this.select_license = null;
    },
    events:{
      "click #publish_btn" : "publish"
    },

    render: function() {
        this.$el.html(this.template({
            channel: window.current_channel.toJSON(),
            licenses: window.licenses.toJSON(),
            version: window.current_channel.get("version") + 1,
            node: this.model.toJSON()
        }));
        $("body").append(this.el);
        this.$(".modal").modal({show: true});
        this.$(".modal").on("hide.bs.modal", this.close);
    },
    close_exporter:function(){
      this.close();
    },
    publish:function(){
        var self = this;
        this.display_load("Publishing...", function(){
            window.current_channel.publish(function(){
                self.callback();
                self.close_exporter();
            });

        });
    }
});

var ExportListView = BaseViews.BaseListView.extend({
    template: require("./hbtemplates/export_list.handlebars"),
    views:[],
    initialize: function(options) {
        this.container = options.container;
        this.collection = new Models.ContentNodeCollection();
        this.collection.get_all_fetch(this.model.get("children"));
        this.render();
    },

    render: function() {
        this.$el.html(this.template({id: this.model.get("id")}));
        this.load_content();
    },
    load_content:function(){
        var self = this;
        this.collection.forEach(function(entry){
            var export_item = new ExportItem({
                model: entry,
                containing_list_view : self
            });
            self.$("#export_list_" + self.model.get("id")).append(export_item.el);
            self.views.push(export_item);
        });
        if(this.collection.length ==0){
            this.$("#export_list_" + self.model.get("id")).append("<em>No files found.</em>");
        }
    }
});

var ExportItem = BaseViews.BaseListNodeItemView.extend({
    template: require("./hbtemplates/export_item.handlebars"),
    className: "export_item",
    'id': function() {
        return "export_item_" + this.model.get("id");
    },

    initialize: function(options) {
        _.bindAll(this, "toggle_subfiles");
        this.containing_list_view = options.containing_list_view;
        this.render();
    },
    events:{
      "click .export_folder" : "toggle_subfiles"
    },
    render: function() {
        this.$el.html(this.template({
            node: this.model.toJSON(),
            isfolder: this.model.get("kind") === "topic",
            isempty:this.model.get("children").length ===0
        }));
        this.$el.data("data", this);
    },
    toggle_subfiles:function(event){
        event.stopPropagation();
        event.preventDefault();
        var el =  this.$el.find("#menu_toggle_" + this.model.id);
        if(!this.export_view){
            this.export_view = new ExportListView({
                el: this.$("#export_item_" + this.model.get("id") + "_sub"),
                container: this,
                model: this.model
            });
        }
        if(el.hasClass("glyphicon-menu-right")){
            this.$("#export_item_" + this.model.get("id") + "_sub").slideDown();
            el.removeClass("glyphicon-menu-right").addClass("glyphicon-menu-down");
        }else{
            this.$("#export_item_" + this.model.get("id") + "_sub").slideUp();
            el.removeClass("glyphicon-menu-down").addClass("glyphicon-menu-right");
        }
    }
});

module.exports = {
    ExportModalView:ExportModalView,
    ExportListView:ExportListView
}