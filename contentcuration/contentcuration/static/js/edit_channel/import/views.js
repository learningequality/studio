var Backbone = require("backbone");
var _ = require("underscore");
var BaseViews = require("edit_channel/views");
var Models = require("edit_channel/models");
require("import.less");
var stringHelper = require("edit_channel/utils/string_helper");

var ImportModalView = BaseViews.BaseModalView.extend({
    template: require("./hbtemplates/import_modal.handlebars"),

    initialize: function(options) {
        _.bindAll(this, "close_importer");
        this.onimport = options.onimport;
        this.parent_view = options.parent_view;
        this.modal = true;
        this.render(this.close, {});
        this.import_view = new ImportView({
            el: this.$(".modal-body"),
            onimport: this.onimport,
            modal : this,
            model:this.model
        });
    },
    close_importer:function(collection){
      this.onimport(collection);
      this.close();
    }
});


var ImportView = BaseViews.BaseListView.extend({
    template: require("./hbtemplates/import_dialog.handlebars"),
    onimport:null,
    lists: [],

    initialize: function(options) {
        // _.bindAll(this, 'import_content');
        this.modal = options.modal;
        this.collection = new Models.ContentNodeCollection();
        this.onimport = options.onimport;
        this.lists=[];
        this.render();
    },
    events: {
      "click #import_content_submit" : "import_content"
    },
    render: function() {
        this.$el.html(this.template());
        var self = this;
        window.current_channel.get_accessible_channel_roots().then(function(collection){
            collection.forEach(function(node){
                node.set('title', node.get('channel_name'));
            });
            self.collection = collection;
            if(self.collection.length > 0){
                self.importList = new ImportList({
                    model: null,
                    el: self.$("#import_from_channel_box"),
                    is_channel: true,
                    collection: self.collection,
                    parent_node_view: null,
                    container: self
                });
            }else{
                self.$("#import_empty_text").text("No channels to import from...");
            }
        });
    },

    update_count:function(){
        var collection = this.get_import_collection();
        if(collection.length ===0){
            $("#import_content_submit").text("Select content to import...");
            $("#import_content_submit").attr("disabled", "disabled");
        }else{
            $("#import_content_submit").text("IMPORT");
            $("#import_content_submit").removeAttr("disabled");
        }
        var totalCount = 0;
        collection.forEach(function(entry){
            if(entry.get("kind") === "topic"){
                totalCount += entry.get("metadata").total_count + 1;
            }else{
                totalCount += entry.get("metadata").total_count;
            }
        });
        var data = this.importList.get_metadata();
        totalCount = totalCount - data.count;

        this.$("#import_file_count").html(totalCount + " Topic" + ((totalCount == 1)? ", " : "s, ") + data.count + " Resource" + ((data.count == 1)? "" : "s"));
        var self = this;
        this.$("#import_file_size").html("Calculating...")
        collection.calculate_size().then(function(size){
            self.$("#import_file_size").html(stringHelper.format_size(size));
        });
    },
    import_content:function(){
        var self = this;
        this.display_load("Importing Content...", function(resolve, reject){
            self.get_import_collection().duplicate(self.model).then(function(copied){
                self.close_importer(copied);
                resolve(true);
            });
        });
    },
    get_import_collection:function(){
        var importCollection = new Models.ContentNodeCollection();
        this.lists.forEach(function(list){
            list.views.forEach(function(item){
                if(item.item_to_import){
                    importCollection.add(item.model);
                }
            })
        });
        return importCollection;
    },
    close_importer:function(collection){
        if(this.modal){
            this.modal.close_importer(collection);
        }else{
            this.onimport(collection);
            this.remove();
        }
    }
});

var ImportList = BaseViews.BaseListView.extend({
    template: require("./hbtemplates/import_list.handlebars"),
    default_item:">.default-item",
    list_selector: ">.import-list",
    initialize: function(options) {
        this.is_channel = options.is_channel;
        this.collection = options.collection;
        this.container = options.container;
        this.metadata = {"count": 0, "size": 0};
        this.parent_node_view = options.parent_node_view;
        this.render();
        this.container.lists.push(this);
    },
    render: function() {
        this.$el.html(this.template({
            node : this.model,
            is_channel:this.is_channel
        }));
        this.load_content();
    },
    create_new_view:function(model){
        var new_view = new ImportItem({
            containing_list_view: this,
            model: model,
            is_channel : this.is_channel,
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
        });
        return this.metadata;
    }
});


var ImportItem = BaseViews.BaseListNodeItemView.extend({
    template: require("./hbtemplates/import_list_item.handlebars"),
    tagName: "li",
    className: "import_list_item",
    selectedClass: "import-selected",
    collapsedClass: "glyphicon-triangle-top",
    expandedClass: "glyphicon-triangle-bottom",
    list_selector: ">.import-list",
    item_to_import: false,

    getToggler: function () { return this.$("#menu_toggle_" + this.model.id); },
    getSubdirectory: function () {return this.$("#" + this.id() +"_sub"); },
    'id': function() {
        return "import_item_" + this.model.get("id");
    },

    initialize: function(options) {
        this.bind_node_functions();
        this.containing_list_view = options.containing_list_view;
        this.is_channel = options.is_channel;
        this.collection = new Models.ContentNodeCollection();
        this.container = options.container;
        this.checked = options.checked;

        this.metadata = {"count": 0, "size": 0};
        this.render();
    },
    events: {
        'click .import_channel_item' : 'toggle',
        'click .tog_folder' : 'toggle',
        'click >.import_checkbox' : 'handle_checked'
    },
    render: function() {
        this.$el.html(this.template({
            node:this.model.toJSON(),
            isfolder: this.is_channel || this.model.get("kind") === "topic",
            is_channel:this.is_channel
        }));
        this.$el.find(".import_checkbox").prop("checked", this.checked);
        this.set_disabled(this.checked);
    },
    handle_checked:function(){
        this.checked =  this.$("#" + this.id() + "_check").is(":checked");
        if(this.checked){
            this.item_to_import = true;
            this.metadata = {"count" : this.model.get("metadata").resource_count, "size": this.model.get("metadata").resource_size};
        }else{
            this.item_to_import = false;
            this.metadata = {"count" : 0, "size": 0};
        }
        if(this.subcontent_view){
            this.subcontent_view.check_all(this.checked);
        }
        this.update_count();
    },
    check_item:function(checked){
        this.item_to_import = false;
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
                model : this.model,
                el: $(self.getSubdirectory()),
                is_channel: false,
                collection: fetched,
                parent_node_view:self,
                container: self.containing_list_view.container
            }
            self.subcontent_view = new ImportList(data);
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
    }
});

module.exports = {
    ImportModalView: ImportModalView,
    ImportView:ImportView
}