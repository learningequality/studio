var Backbone = require("backbone");
var _ = require("underscore");
var BaseViews = require("edit_channel/views");
var Models = require("edit_channel/models");
require("uploader.less");
var stringHelper = require("edit_channel/utils/string_helper");

var ImportView = BaseViews.BaseModalView.extend({
    template: require("./hbtemplates/import_dialog.handlebars"),
    modal_template: require("./hbtemplates/import_modal.handlebars"),
    initialize: function(options) {
        _.bindAll(this, 'import_content');
        this.modal = options.modal;
        this.parent_view = options.parent_view;
        this.other_channels = window.channels.clone();
        this.other_channels.remove(window.current_channel);
        this.mainCollection = new Models.ContentNodeCollection();
        this.callback = options.callback;
        this.render();
    },
    events: {
      "click #import_content_submit" : "import_content"
    },

    render: function() {
        if (this.modal) {
            this.$el.html(this.modal_template());
            this.$(".modal-body").append(this.template());
            $("body").append(this.el);
            this.$(".modal").modal({show: true});
            this.$(".modal").on("hide.bs.modal", this.close);
        } else {
            this.$el.html(this.template());
        }

        var channel_collection = new Models.ContentNodeCollection();
        this.other_channels.forEach(function(channel){
            var node = channel.get_root("main_tree");
            node.set({title:channel.get("name")});
            channel_collection.add(node);
        });

        var importList = new ImportList({
            parent_view: this,
            model : null,
            mainCollection: this.mainCollection,
            indent:20,
            index:0,
            el:$("#import_from_channel_box"),
            is_channel: true,
            collection :  channel_collection,
            selected:false,
            parent_topic:null
        });
    },
    update_file_count:function(){
        var checked_items = this.$el.find("#import_from_channel_box>ul:first-child>li>.import_checkbox:checked");
        var file_count = 0;
        var file_size = 0;
        for(var i = 0; i < checked_items.length; i++){
            var view = $(checked_items[i]).parent("li").data("data");
            file_count += view.selected_count;
            file_size += view.selected_size;
        }

        if(file_count == 0){
            this.$el.find("#import_file_count").html("<em>No files selected</em>");
            $("#import_content_submit").prop("disabled", true);
        }else{
            $("#import_content_submit").prop("disabled", false);
            this.$el.find("#import_file_count").html(file_count + " file" + ((file_count == 1)? "   " : "s   ") + stringHelper.format_size(file_size));
        }
    },
    import_content:function(){
        var self = this;
        this.display_load("Importing Content...", function(){
            var checked_items = self.$el.find("#import_from_channel_box .import_checkbox:checked");
            var copyCollection = new Models.ContentNodeCollection();
            for(var i = 0; i < checked_items.length; i++){
                var view = $(checked_items[i]).parent("li").data("data");
                if(view.model && view.model.get("kind") != "topic"){
                    copyCollection.add(view.model);
                }else if(view.model && !view.subfile_view){
                    self.import_children(view.model.get("children"), copyCollection);
                }
            }
            console.log("IMPORTING COLLECTION:", copyCollection);
            self.callback(copyCollection.duplicate(null, {async:false}));
            self.close();
        });
    },
    import_children:function(children, copyCollection){
        var childrenCollection = this.mainCollection.get_all_fetch(children);
        var self = this;
        childrenCollection.forEach(function(node){
            if(node.get("kind") === "topic"){
                self.import_children(node.get("children"), copyCollection);
            }else{
                copyCollection.add(node);
            }
        });
    }
});

var ImportList = BaseViews.BaseListView.extend({
    template: require("./hbtemplates/import_list.handlebars"),
    initialize: function(options) {
        this.mainCollection = options.mainCollection;
        this.indent = options.indent;
        this.index = options.index;
        this.parent_view = options.parent_view;
        this.is_channel = options.is_channel;
        this.collection = options.collection;
        this.selected = options.selected;
        this.parent_topic = options.parent_topic;
        this.render();
    },
    render: function() {
        this.views = [];
        this.$el.html(this.template({
            index : this.index,
            is_empty : this.collection.length == 0,
            is_channel:this.is_channel
        }));

        var self = this;
        this.list_index = 0;
        this.collection.forEach(function(entry){
            var item_view = new ImportItem({
                containing_list_view: self,
                model: entry,
                indent : self.indent,
                index : self.list_index ++,
                is_channel : self.is_channel,
                mainCollection : self.mainCollection,
                selected:self.selected,
                parent_topic:self.parent_topic
            });
            self.$el.find("#import_list_" + self.index).append(item_view.el);
            if(entry.get("kind")=="topic"){
                item_view.check_topic();
            }
            self.views.push(item_view);
        });
    },
    handle_checked_item:function(){
        if(this.parent_topic){
            this.parent_topic.check_topic();
        }else{
            this.parent_view.update_file_count();
        }
    }
});

var ImportItem = BaseViews.BaseListNodeItemView.extend({
    template: require("./hbtemplates/import_list_item.handlebars"),
    tagName: "li",
    className: "import_list_item",
    indent: 0,
    'id': function() {
        return "import_item_" + this.model.get("id");
    },

    initialize: function(options) {
        _.bindAll(this, 'toggle', 'check_item');
        this.containing_list_view = options.containing_list_view;
        this.indent = options.indent;
        this.index = options.index;
        this.is_channel = options.is_channel;
        this.collection = new Models.ContentNodeCollection();
        this.mainCollection = options.mainCollection;
        this.selected = options.selected;
        this.selected_count = 0;
        this.selected_size = 0;
        this.subfiles_loaded= false;
        this.render();
    },
    events: {
        'click .tog_folder' : 'toggle',
        'click >.import_checkbox' : 'check_item'
    },
    render: function() {
        this.$el.html(this.template({
            node:this.model,
            isfolder: this.model.get("kind").toLowerCase() == "topic",
            sub_list: this.model.get("children"),
            indent: this.indent,
            index: this.index,
            is_channel:this.is_channel
        }));
        this.$el.data("data", this);
        this.$el.find(".import_checkbox").first().prop("checked", this.selected);
    },
    check_item:function(){
        this.selected =  this.$el.find(".import_checkbox").first().is(":checked");

        if(this.model.get("kind") != "topic"){
            this.selected_count = (this.selected)? 1:0;
            this.selected_size = (this.selected)? this.model.get("resource_size") : 0;
            this.containing_list_view.handle_checked_item();
        }
        else{
            var subfiles = this.$el.find("#" + this.id() +"_sub .import_checkbox");
            for(var f = 0; f < subfiles.length; f++){
                $(subfiles[f]).prop("checked", this.selected);
                $(subfiles[f]).parent("li").data("data").check_item();
            }
            this.check_topic();
        }
    },
    toggle:function(){
        event.stopPropagation();
        event.preventDefault();
        this.load_subfiles();
        var el =  this.$el.find("#menu_toggle_" + this.model.id);
        var collapsed_symbol = (this.is_channel)? "glyphicon-menu-right" : "glyphicon-triangle-top";
        var expanded_symbol = (this.is_channel)? "glyphicon-menu-down" : "glyphicon-triangle-bottom";

        if(el.hasClass(collapsed_symbol)){
            this.$el.find("#" + this.id() +"_sub").slideDown();
            el.removeClass(collapsed_symbol).addClass(expanded_symbol);
        }else{
            this.$el.find("#" + this.id() +"_sub").slideUp();
            el.removeClass(expanded_symbol).addClass(collapsed_symbol);
        }
    },
    check_topic:function(){
        var checked_items = this.$el.find("#" + this.id() +"_sub>ul:first-child>li>.import_checkbox:checked");
        this.selected = (!this.subfile_view && this.selected) || checked_items.length > 0;
        this.$el.find(".import_checkbox").first().prop("checked", this.selected);

        this.selected_count = 0;
        this.selected_size = 0;

        if(!this.subfile_view && this.selected){
            this.selected_count = this.model.get("resource_count");
            this.selected_size = this.model.get("resource_size");
            console.log("before render, count is", this.selected_count);
        }else{
            for(var i = 0; i < checked_items.length; i++){
                this.selected_count += $(checked_items[i]).parent("li").data("data").selected_count;
                this.selected_size +=  $(checked_items[i]).parent("li").data("data").selected_size;
            }
        }

        this.$el.find(".badge").first().css("visibility", (this.selected)? "visible":"hidden");
        this.$el.find(".badge").first().html(this.selected_count);

        this.containing_list_view.handle_checked_item();
    },
    load_subfiles:function(){
        if(this.collection.length == 0){
             this.collection = this.mainCollection.get_all_fetch(this.model.get("children"));
             this.collection.sort_by_order();
             this.subfile_view = new ImportList({
                model : this.model,
                indent: this.indent + 20,
                el: $("#" + this.id() + "_sub"),
                mainCollection: this.containing_list_view.mainCollection,
                parent_view: this.containing_list_view.parent_view,
                index: this.index + 1,
                is_channel: false,
                collection: this.collection,
                selected: this.selected,
                parent_topic : this
            });
        }
    }
});

module.exports = {
    ImportView: ImportView
}