var Backbone = require("backbone");
var _ = require("underscore");
var BaseViews = require("edit_channel/views");
var Models = require("edit_channel/models");
require("export.less");

var ExportModalView = BaseViews.BaseModalView.extend({
    template: require("./hbtemplates/export_modal.handlebars"),
    license_template: require("./hbtemplates/export_license.handlebars"),

    initialize: function(options) {
        _.bindAll(this, "close_exporter", "load_license", "select_license", "publish");
        this.render();
        this.modal = true;
        this.callback = options.callback;
        this.export_view = new ExportListView({
            el: this.$("#export_preview"),
            container: this,
            model: this.model
        });
        this.select_license = null;
    },
    events:{
      "change #export_license_select" : "select_license",
      "click #license_about": "load_license",
      "click #publish_btn" : "publish"
    },

    render: function() {
        this.$el.html(this.template({
            channel: window.current_channel.toJSON(),
            licenses: window.licenses.toJSON(),
            version: window.current_channel.get("version") + 1,
            node: this.model.toJSON(),
            count: this.model.get("resource_count") + ((this.model.get("resource_count") === 1)? " Resource" : " Resources")
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
            license: this.select_license.toJSON()
        }));
        this.$("#license_modal").modal({show: true});
    },
    select_license:function(){
        this.select_license = window.licenses.get($("#export_license_select").val());
        this.$("#publish_btn").removeAttr("disabled");
        this.$("#publish_btn").text("PUBLISH");
        this.$("#license_about").css("display", "inline");
    },
    publish:function(){
        var self = this;
        this.display_load("Publishing...", function(){
            window.current_channel.publish(self.select_license, function(){
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