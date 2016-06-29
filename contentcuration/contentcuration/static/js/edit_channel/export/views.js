var Backbone = require("backbone");
var _ = require("underscore");
var BaseViews = require("edit_channel/views");
var Models = require("edit_channel/models");
require("export.less");

var ExportModalView = BaseViews.BaseModalView.extend({
    template: require("./hbtemplates/export_modal.handlebars"),
    license_template: require("./hbtemplates/export_license.handlebars"),

    initialize: function(options) {
        _.bindAll(this, "close_exporter", "load_license", "select_license");
        this.render();
        this.export_view = new ExportListView({
            el: this.$("#export_preview"),
            container: this,
            model: window.current_channel.get_root("main_tree")
        });
    },
    events:{
      "change #export_license_select" : "select_license",
      "click #license_about": "load_license"
    },

    render: function() {
        this.$el.html(this.template({
            channel: window.current_channel.toJSON(),
            licenses: window.licenses.toJSON(),
            version: window.current_channel.get("version") + 1,
            node: window.current_channel.get_root("main_tree").toJSON()
        }));
        $("body").append(this.el);
        this.$("#export_modal").modal({show: true, backdrop: 'static', keyboard: false});
        this.$("#export_modal").on("hide.bs.modal", this.close);
    },
    close_exporter:function(){
      this.close();
    },
    load_license:function(){
        this.$("#license_modal").html(this.license_template({
            license: window.licenses.get($("#export_license_select").val()).toJSON()
        }));
        this.$("#license_modal").modal({show: true});
    },
    select_license:function(){
        this.$("#publish_btn").removeAttr("disabled");
        this.$("#publish_btn").text("PUBLISH");
        this.$("#license_about").css("display", "inline");
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
        if(this.collection.length ==0){
            this.$("#export_list_" + self.model.get("id")).append("<em>No files found.</em>");
        }
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
            isempty:this.model.get("children").length ===0,
            icon:this.get_icon()
        }));
        this.$el.data("data", this);
    },
    get_icon:function(){
        switch (this.model.get("kind")){
            case "topic":
                return "folder-close";
            case "video":
                return "film";
            case "audio":
                return "headphones";
            case "image":
                return "picture";
            case "exercise":
                return "star";
            case "document":
                return "file";
            default:
                return "fire"; //TODO: Change this later if necessary
        }
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