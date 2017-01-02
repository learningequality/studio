var Backbone = require("backbone");
var _ = require("underscore");
var BaseViews = require("edit_channel/views");
var Models = require("edit_channel/models");
require("archive.less");
var stringHelper = require("edit_channel/utils/string_helper");

var ArchiveModalView = BaseViews.BaseModalView.extend({
    template: require("./hbtemplates/archive_modal.handlebars"),

    initialize: function(options) {
        this.modal = true;
        this.render(this.close, {channel:window.current_channel.toJSON()});
        this.archive_view = new ArchiveView({
            el: this.$(".modal-body"),
            modal : this,
            model:this.model
        });
    }
});


var ArchiveView = BaseViews.BaseWorkspaceView.extend({
    template: require("./hbtemplates/archive_dialog.handlebars"),
    initialize: function(options) {
        _.bindAll(this, 'restore_content', 'delete_content', 'update_count', 'select_all');
        this.bind_workspace_functions();
        this.modal = options.modal;
        this.render();
    },
    events: {
      "click #restore_content" : "restore_content",
      "click #delete_selected_button" : "delete_content",
      "change #select_all_check" : "select_all"
    },
    render: function() {
        this.$el.html(this.template({
            is_empty:this.model.get("children").length===0,
        }));
        this.main_archive_list = new ArchiveList({
            model : this.model,
            el: this.$("#archive_content"),
            container: this,
            parent_node_view:null
        });
        this.lists.push(this.main_archive_list);
    },
    select_all:function(event){
        var checked = this.$("#select_all_check").is(":checked");
        this.main_archive_list.views.forEach(function(view){
            console.log($("#" + view.id() + "_check"))
            $("#" + view.id() + "_check").prop("checked", checked);
            view.handle_checked();
        })
    },
    update_count:function(){
        var collection = this.get_selected_views();
        if(collection.length ===0){
            $(".archive_option").attr("disabled", "disabled");
            $(".archive_option").addClass("disabled");
        }else{
            $(".archive_option").removeAttr("disabled");
            $(".archive_option").removeClass("disabled");
        }
        var totalCount = 0;
        collection.forEach(function(entry){
            totalCount += entry.model.get("metadata").total_count + 1;
        });
        var data = this.main_archive_list.get_metadata();
        var status = "";
        switch(totalCount){
            case 0:
                status = "";
                break;
            case 1:
                status = totalCount + " item selected, " + stringHelper.format_size(data.size);
                break;
            default:
                status = totalCount + " items selected, " + stringHelper.format_size(data.size);
        }
        this.$("#archive_selected_count").html(status);
    },
    restore_content:function(){
        var list = this.get_selected_views();
        var moveCollection = new Models.ContentNodeCollection();
        this.$("#select_all_check").attr("checked", false);
        for(var i =0;i < list.length; i++){
            var view = list[i];
            if(view){
                moveCollection.add(view.model);
            }
        }
        this.move_content(moveCollection);
    },
    delete_content:function(){
        if(confirm("Are you sure you want to delete these selected items permanently? Changes cannot be undone!")){
            this.delete_items_permanently("Deleting Content...", this.get_selected_views(), this.update_count);
            this.$("#select_all_check").attr("checked", false);
        }
    },
    get_selected_views:function(){
        var views = [];
        this.lists.forEach(function(list){
            list.views.forEach(function(item){
                if(item.item_to_archive){
                    views.push(item);
                }
            })
        });
        return views;
    }
});

var ArchiveList = BaseViews.BaseWorkspaceListView.extend({
    template: require("./hbtemplates/archive_list.handlebars"),
    default_item:">.default-item",
    list_selector: ">.archive-list",
    initialize: function(options) {
        _.bindAll(this, 'update_count');
        this.collection = new Models.ContentNodeCollection();
        this.container = options.container;
        this.metadata = {"count": 0, "size": 0};
        this.parent_node_view = options.parent_node_view;
        this.render();
        this.container.lists.push(this);
    },
    render: function() {
        this.load_content();
        this.$el.html(this.template({
            node : this.model.toJSON()
        }));
        this.$(this.default_item).text("Loading...");
        var self = this;
        this.retrieve_nodes(this.model.get("children")).then(function(fetchedCollection){
            self.$(self.default_item).text("No items found.");
            fetchedCollection.sort_by_order();
            self.load_content(fetchedCollection);
        });
        window.workspace_manager.put_list(this.model.get("id"), this);
    },
    create_new_view:function(model){
        var new_view = new ArchiveItem({
            containing_list_view: this,
            model: model,
            checked: (this.parent_node_view)? this.parent_node_view.checked : false,
            container: this.container
        });
        this.views.push(new_view);
        return new_view;
    },
    check_all:function(checked){
        this.views.forEach(function(entry){
            entry.check_item(checked);
            entry.set_disabled(checked);
            if(entry.subcontent_view){
                entry.subcontent_view.check_all(checked);
            }
        });
    },
    update_count:function(){
        if(this.parent_node_view){
            this.parent_node_view.update_count();
        }else{
            this.container.update_count();
        }
    },
    get_metadata:function(){
        var self = this;
        this.metadata = {"count" : 0, "size":0};
        this.views.forEach(function(entry){
            self.metadata.count += entry.metadata.count;
            self.metadata.size += entry.metadata.size;
        });
        return this.metadata;
    },
    delete_items:function(){
        if(confirm("Are you sure you want to delete these selected items permanently? Changes cannot be undone!")){
            this.delete_items_permanently("Deleting Content...", this.update_count);
            this.$(".select_all").attr("checked", false);
        }
    }
});


var ArchiveItem = BaseViews.BaseWorkspaceListNodeItemView.extend({
    template: require("./hbtemplates/archive_list_item.handlebars"),
    tagName: "li",
    className: "archive_list_item modal-list-item-default",
    selectedClass: "archive-selected",
    collapsedClass: "glyphicon-triangle-top",
    expandedClass: "glyphicon-triangle-bottom",
    list_selector: ">.archive-list",
    item_to_archive: false,

    getToggler: function () { return this.$("#menu_toggle_" + this.model.get("id")); },
    getSubdirectory: function () {return this.$("#" + this.id() +"_sub"); },
    'id': function() {
        return "archive_item_" + this.model.get("id");
    },

    initialize: function(options) {
        _.bindAll(this, 'delete_content', 'update_count', 'restore_content');
        this.bind_edit_functions();
        this.containing_list_view = options.containing_list_view;
        this.collection = new Models.ContentNodeCollection();
        this.container = options.container;
        this.checked = options.checked;

        this.metadata = {"count": 0, "size": 0};
        this.render();
    },
    events: {
        'click .delete_content' : 'delete_content',
        'click .restore_content' : 'restore_content',
        'click .tog_folder' : 'toggle',
        'click >.item_wrapper .archive_checkbox' : 'handle_checked'
    },
    render: function() {
        this.$el.html(this.template({
            node:this.model.toJSON(),
            isfolder: this.model.get("kind") === "topic",
            checked: this.checked
        }));
        this.$el.find(".archive_checkbox").prop("checked", this.checked);
        this.set_disabled(this.checked);
        window.workspace_manager.put_node(this.model.get("id"), this);
    },
    handle_checked:function(){
        this.checked =  this.$("#" + this.id() + "_check").is(":checked");
        if(this.checked){
            this.item_to_archive = true;
            this.metadata = {"count" : this.model.get("metadata").resource_count, "size": this.model.get("metadata").resource_size};
        }else{
            this.item_to_archive = false;
            this.metadata = {"count" : 0, "size": 0};
        }
        if(this.subcontent_view){
            this.subcontent_view.check_all(this.checked);
        }
        this.update_count();
    },
    check_item:function(checked){
        this.item_to_archive = false;
        this.metadata = (checked)?
                        {"count": this.model.get("metadata").resource_count, "size": this.model.get("metadata").resource_size}
                        : {"count": 0, "size": 0}
        this.$("#" + this.id() + "_check").prop("checked", checked);
        this.$("#" + this.id() + "_count").text(this.model.get("metadata").resource_count);
        this.$("#" + this.id() + "_count").css("visibility", (checked)?"visible" : "hidden" );
        this.checked = checked;
    },
    load_subfiles:function(){
        var self = this;
        this.collection.get_all_fetch(this.model.get("children")).then(function(fetched){
            var data = {
                model : self.model,
                el: $(self.getSubdirectory()),
                collection: fetched,
                parent_node_view:self,
                container: self.containing_list_view.container
            }
            self.subcontent_view = new ArchiveList(data);
        });
    },
    set_disabled:function(isDisabled){
        if(isDisabled){
            this.$el.addClass("disabled");
            this.$("#" + this.id() + "_check").attr("disabled", "disabled");
        }else{
            this.$el.removeClass("disabled");
            this.$("#" + this.id() + "_check").removeAttr("disabled");
        }
    },
    update_count:function(){
        if(this.subcontent_view){
            this.metadata = this.subcontent_view.get_metadata();
        }
        this.$("#" + this.id() + "_count").css("visibility", (this.metadata.count === 0)? "hidden" : "visible");
        this.$("#" + this.id() + "_count").text(this.metadata.count);
        this.containing_list_view.update_count();
    },
    delete_content:function(event){
        event.stopPropagation();
        event.preventDefault();
        if(confirm("Are you sure you want to PERMANENTLY delete " + this.model.get("title") + "? Changes cannot be undone!")){
            var self = this;
            this.delete(true, "Deleting Content...", function(){self.containing_list_view.update_count();});
        }
    },
    restore_content:function(event){
        event.stopPropagation();
        event.preventDefault();
        var moveCollection = new Models.ContentNodeCollection();
        moveCollection.add(this.model);
        this.container.move_content(moveCollection);
    }
});

module.exports = {
    ArchiveModalView: ArchiveModalView,
    ArchiveView:ArchiveView
}