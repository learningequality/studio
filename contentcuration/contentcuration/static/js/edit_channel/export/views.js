var Backbone = require("backbone");
var _ = require("underscore");
var BaseViews = require("edit_channel/views");
var Models = require("edit_channel/models");
require("export.less");

var ExportModalView = BaseViews.BaseModalView.extend({
    template: require("./hbtemplates/export_modal.handlebars"),
    license_template: require("./hbtemplates/export_license.handlebars"),

    initialize: function(options) {
        _.bindAll(this, "close_exporter", "load_license");
        this.render();
        this.export_view = new ExportListView({
            el: this.$("#export_preview"),
            container: this,
            model: window.current_channel.get_root("main_tree")
        });
    },
    events:{
      "change #export_license_select" : "load_license"
    },

    render: function() {
        this.$el.html(this.template({
            channel: window.current_channel.toJSON(),
            licenses: window.licenses.toJSON()
        }));
        $("body").append(this.el);
        this.$(".modal").modal({show: true, backdrop: 'static', keyboard: false});
        this.$(".modal").on("hide.bs.modal", this.close);
    },
    close_exporter:function(){
      this.close();
    },
    load_license:function(event){
        console.log($("#export_license_select").val());
        this.$("#license_preview").html(this.license_template({
            license: window.licenses.get($("#export_license_select").val()).toJSON()
        }));
    }
});

var ExportListView = BaseViews.BaseListView.extend({
    template: require("./hbtemplates/export_list.handlebars"),
    views:[],
    initialize: function(options) {
        _.bindAll(this, "publish");
        this.container = options.container;
        this.collection = new Models.ContentNodeCollection();
        this.collection.get_all_fetch(this.model.get("children"));
        this.render();
    },
    events:{
      "click #publish_btn" : "publish"
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
    },
    publish:function(){
        // var self = this;
        // this.views.forEach(function(view){
        //     self.returnCollection.add(view.submit_file());
        // });
        // this.container.close_file_uploader();
        //window.current_channel.get_root("main_tree")
    }
});

var ExportItem = BaseViews.BaseListNodeItemView.extend({
    template: require("./hbtemplates/export_item.handlebars"),
    className: "format_item row",
    'id': function() {
        return "export_item_" + this.model.get("id");
    },

    initialize: function(options) {
        this.containing_list_view = options.containing_list_view;
        this.render();
    },
    render: function() {
        this.$el.html(this.template({
            node: this.model.toJSON()
        }));
        this.$el.data("data", this);
    }
});

module.exports = {
    ExportModalView:ExportModalView,
    ExportListView:ExportListView
}