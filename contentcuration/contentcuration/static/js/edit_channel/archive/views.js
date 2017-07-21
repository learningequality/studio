var Backbone = require("backbone");
var _ = require("underscore");
var BaseViews = require("edit_channel/views");
var Models = require("edit_channel/models");
require("archive.less");
var stringHelper = require("edit_channel/utils/string_helper");
var dialog = require("edit_channel/utils/dialog");

var NAMESPACE = "archive";
var MESSAGES = {
    "header": "Managing deleted content",
    "count": "{num, plural,\n =0 {}\n =1 {# item selected }\n other {# items selected }}",
    "delete_message": "Are you sure you want to delete these selected items permanently? Changes cannot be undone!",
    "cancel": "CANCEL",
    "delete": "DELETE",
    "deleting_content": "Deleting Content...",
    "restore_selected": "Restore Selected",
    "delete_selected": "Delete Selected",
    "select_all": "Select All",
    "close": "CLOSE",
    "loading": "Loading...",
    "no_items": "No items found",
    "empty": "(empty)",
    "warning": "WARNING",
    "delete_item_warning": "Are you sure you want to PERMANENTLY delete this item? Changes cannot be undone!"
}

var ArchiveModalView = BaseViews.BaseModalView.extend({
    template: require("./hbtemplates/archive_modal.handlebars"),
    name: NAMESPACE,
    messages: MESSAGES,

    initialize: function(options) {
        this.modal = true;
        this.render(this.close, {channel:window.current_channel.toJSON()});
        new ArchiveView({
            el: this.$(".modal-body"),
            modal : this,
            model:this.model
        });
    }
});


var ArchiveView = BaseViews.BaseWorkspaceView.extend({
    template: require("./hbtemplates/archive_dialog.handlebars"),
    name: NAMESPACE,
    messages: MESSAGES,
    initialize: function(options) {
        _.bindAll(this, 'restore_content', 'delete_content', 'update_count', 'select_all');
        this.bind_workspace_functions();
        this.lists = [];
        this.modal = options.modal;
        this.render();
    },
    events: {
      "click #restore_content" : "restore_content",
      "click #delete_selected_button" : "delete_content",
      "change #select_all_check" : "select_all",
      "focus .input-tab-control": "loop_focus"
    },
    render: function() {
        this.$el.html(this.template(null, {
            data: this.get_intl_data()
        }));
        this.main_archive_list = new ArchiveList({
            model : this.model,
            el: this.$("#archive_content"),
            container: this,
            content_node_view:null
        });
    },
    select_all:function(event){
        var checked = this.$("#select_all_check").is(":checked");
        this.main_archive_list.views.forEach(function(view){
            $("#" + view.id() + "_check").prop("checked", checked);
            view.handle_checked();
        })
    },
    update_count:function(){
        var collection = new Models.ContentNodeCollection(_.pluck(this.get_selected_views(), "model"));
        if(collection.length ===0){
            $(".archive_option").attr("disabled", "disabled");
            $(".archive_option").addClass("disabled");
        }else{
            $(".archive_option").removeAttr("disabled");
            $(".archive_option").removeClass("disabled");
        }
        var data = this.main_archive_list.get_metadata();
        this.$("#archive_selected_count").html(this.get_translation("count", collection.length));
    },
    restore_content:function(){
        var list = this.get_selected();
        var moveCollection = new Models.ContentNodeCollection(_.pluck(this.main_archive_list.get_selected(), 'model'));
        this.$("#select_all_check").attr("checked", false);
        this.move_content(moveCollection);
    },
    delete_content:function(){
        var self = this;
        dialog.dialog(this.get_translation("warning"), self.get_translation("delete_message"), {
            [self.get_translation("cancel")]:function(){},
            [self.get_translation("delete")]: function(){
                self.delete_items_permanently(self.get_translation("deleting_content"), self.get_selected(), self.update_count);
                self.$("#select_all_check").attr("checked", false);
            },
        }, function(){ });
    },
    handle_move:function(target, moved, original_parents){
        // Recalculate counts
        var reloadCollection = new Models.ContentNodeCollection();
        reloadCollection.add(original_parents.models);
        reloadCollection.add(moved.models);
        this.reload_ancestors(reloadCollection, true);

        // Remove where nodes originally were
        var content = window.workspace_manager.get(target.id);
        // if(content  && content.node){ node.deselect(); }
        moved.forEach(function(node){ window.workspace_manager.remove(node.id)});

        // Add nodes to correct place
        content = window.workspace_manager.get(target.id);
        if(content && content.list) {
            content.list.add_nodes(moved);
        }
        this.update_count();
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
    default_item:">.archive-list >.default-item",
    list_selector: ">.archive-list",
    name: NAMESPACE,
    messages: MESSAGES,
    initialize: function(options) {
        _.bindAll(this, 'update_count', 'get_metadata');
        this.collection = new Models.ContentNodeCollection();
        this.container = options.container;
        this.metadata = {"count": 0, "size": 0};
        this.views = [];
        this.content_node_view = options.content_node_view;
        this.render();
        this.container.lists.push(this);
    },
    render: function() {
        this.load_content();
        this.$el.html(this.template({
            node : this.model.toJSON()
        }, {
            data: this.get_intl_data()
        }));
        this.$(this.default_item).text(this.get_translation("loading"));
        var self = this;
        this.retrieve_nodes(this.model.get("children")).then(function(fetchedCollection){
            self.$(self.default_item).text(self.get_translation("no_items"));
            fetchedCollection.sort_by_order();
            self.load_content(fetchedCollection);
            window.workspace_manager.put_list(self.model.id, self);
            self.container.set_indices();
            self.container.set_initial_focus();
        });
    },
    create_new_view:function(model){
        var new_view = new ArchiveItem({
            containing_list_view: this,
            model: model,
            checked: (this.content_node_view)? this.content_node_view.checked : false,
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
        if(this.content_node_view){
            this.content_node_view.update_count();
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
    }
});


var ArchiveItem = BaseViews.BaseWorkspaceListNodeItemView.extend({
    template: require("./hbtemplates/archive_list_item.handlebars"),
    options_template:require("./hbtemplates/archive_list_item_options.handlebars"),
    tagName: "li",
    className: "archive_list_item modal-list-item-default",
    selectedClass: "archive-selected",
    collapsedClass: "glyphicon-triangle-top",
    expandedClass: "glyphicon-triangle-bottom",
    list_selector: ">.archive-list",
    item_to_archive: false,
    name: NAMESPACE,
    messages: MESSAGES,

    getToggler: function () { return this.$("#menu_toggle_" + this.model.get("id")); },
    getSubdirectory: function () {return this.$("#" + this.id() +"_sub"); },
    'id': function() {
        return "archive_item_" + this.model.get("id");
    },

    initialize: function(options) {
        _.bindAll(this, 'delete_content', 'update_count', 'restore_content', 'handle_move', 'deselect');
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
        }, {
            data: this.get_intl_data()
        }));
        this.load_folder_toggle();
        this.$el.find(".archive_checkbox").prop("checked", this.checked);
        this.set_disabled(this.checked);
        window.workspace_manager.put_node(this.model.id, this);
    },
    reload:function(model){
        this.model.set(model.attributes);
        this.load_folder_toggle();
        this.update_count();
        this.check_item(false);
    },
    load_folder_toggle:function(){
        if(this.model.get("kind")==="topic"){
            this.$("#" + this.id() + "_options").html(this.options_template({
                node:this.model.toJSON(),
                is_open:this.getSubdirectory().is(":visible")
            }, {
                data: this.get_intl_data()
            }));
        }
    },
    handle_checked:function(){
        this.checked =  this.$("#" + this.id() + "_check").is(":checked");
        if(this.checked){
            this.item_to_archive = true;
            this.metadata = {"count" : 1, "size": this.model.get("metadata").resource_size};
        }else{
            this.item_to_archive = false;
            this.metadata = {"count" : 0, "size": 0};
        }
        if(this.subcontent_view){
            this.subcontent_view.check_all(this.checked);
        }
        this.update_count();
        this.container.set_initial_focus();
    },
    check_item:function(checked){
        this.item_to_archive = false;
        this.metadata = (checked)?
                        {"count": 1, "size": this.model.get("metadata").resource_size}
                        : {"count": 0, "size": 0}
        this.$("#" + this.id() + "_check").prop("indeterminate", false);
        this.$("#" + this.id() + "_check").prop("checked", checked);
        this.$("#" + this.id() + "_count").css("display", (this.metadata.size === 0)? "none" : "inline-block");
        this.$("#" + this.id() + "_count").text(stringHelper.format_size(this.metadata.size));
        this.checked = checked;
    },
    load_subfiles:function(){
        var self = this;
        this.collection.get_all_fetch(this.model.get("children")).then(function(fetched){
            var data = {
                model : self.model,
                el: self.getSubdirectory(),
                collection: fetched,
                content_node_view:self,
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
        this.metadata = (this.subcontent_view) ? this.subcontent_view.get_metadata() : this.metadata;
        this.$("#" + this.id() + "_count").css("display", (this.metadata.size === 0)? "none" : "inline-block");
        this.$("#" + this.id() + "_count").text(stringHelper.format_size(this.metadata.size));
        this.$("#" + this.id() + "_check").prop("indeterminate", !this.checked && this.metadata.count > 0);
        this.containing_list_view.update_count();
    },
    delete_content:function(event){
        event.stopPropagation();
        event.preventDefault();
        var self = this;
        dialog.dialog(this.get_translation("warning"), this.get_translation("delete_item_warning"), {
            [self.get_translation("cancel")]:function(){},
            [self.get_translation("delete")]: function(){
                self.delete(true, self.get_translation("deleting_content"), function(){
                    self.metadata = {"count": 0, "size": 0};
                    self.item_to_archive = false;
                    self.containing_list_view.update_count();
                });
            },
        }, null);
    },
    restore_content:function(event){
        event.stopPropagation();
        event.preventDefault();
        this.open_move();
    },
    handle_move:function(target, moved, original_parents){
        // Recalculate counts
        this.reload_ancestors(original_parents, true);

        // Remove where node originally was
        window.workspace_manager.remove(this.model.id)

        // Add nodes to correct place
        var content = window.workspace_manager.get(target.id);
        if(content && content.list){
            content.list.add_nodes(moved);
        }
        this.deselect();
    },
    deselect: function(){
        this.metadata = {"count": 0, "size": 0};
        this.item_to_archive = this.checked = false;
        this.containing_list_view.update_count();
    }
});

module.exports = {
    ArchiveModalView: ArchiveModalView,
    ArchiveView:ArchiveView
}