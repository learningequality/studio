var Backbone = require("backbone");
var _ = require("underscore");
var BaseViews = require("edit_channel/views");
var Models = require("edit_channel/models");
require("selected.less");
var stringHelper = require("edit_channel/utils/string_helper");
var treeBuilder = require("edit_channel/utils/tree_builder");

function PrerequisiteTree() {
    var self = this;
    this.prerequisites = {};
    this.postrequisites = {};
    this.prerequisite_list = [];
    this.postrequisite_list = [];
    this.tree_collection = new Models.ContentNodeCollection;
    this.selected = [];
    this.ancestors = [];

    this.is_selected = function(id){ return _.contains(this.selected, id); };
    this.is_prerequisite = function(id){ return _.contains(this.prerequisite_list, id); };
    this.is_postrequisite = function(id){ return _.contains(this.postrequisite_list, id); };
    this.prerequisite_count = function(){ return this.prerequisite_list.length; };
    this.is_immediate_prerequisite = function(id){ return _.contains(_.keys(this.prerequisites), id); };
    this.set = function(prereqmapping, postreqmapping, selected, tree_collection){
        this.selected = selected.pluck('id');
        this.tree_collection = tree_collection;
        this.ancestors = _.uniq(_.flatten(this.tree_collection.pluck('ancestors')));
        this.prerequisites = {}
        this.postrequisites = {}
        this.update_tree(prereqmapping, postreqmapping);
    };
    this.update_tree = function(prerequisite_mapping, postrequisite_mapping){
        _.each(_.keys(prerequisite_mapping), function(key){ self.prerequisites[key] = prerequisite_mapping[key]; });
        _.each(_.keys(postrequisite_mapping), function(key){ self.postrequisites[key] = postrequisite_mapping[key]; });
        this.prerequisite_list = this.get_all_keys(this.prerequisites);
        this.postrequisite_list = this.get_all_keys(this.postrequisites);
        this.flat_prerequisite_tree = this.get_flat_tree(this.prerequisites);
        this.flat_postrequisite_tree = this.get_flat_tree(this.postrequisites);
    };
    this.get_all_keys = function(jsonObject){
        return _.chain(jsonObject).map(function(item){ return self.get_all_keys(item); }).union(_.keys(jsonObject)).uniq().flatten().value();
    };
    this.get_flat_tree = function(jsonObject, tree_dict){
        tree_dict = tree_dict || {};
        _.each(_.keys(jsonObject), function(key){
            tree_dict[key] = _.keys(jsonObject[key]);
            self.get_flat_tree(jsonObject[key], tree_dict);
        });
        return tree_dict;
    };
    this.get_postrequisite_collection_for = function(id){
        var collection = new Models.ContentNodeCollection();
        if(this.flat_postrequisite_tree[id]){
            collection.reset(this.tree_collection.filter(function(item){ return _.contains(self.flat_postrequisite_tree[id], item.id); }));
        }
        return collection;
    };
    this.get_simplified_tree = function(node_list, relation){
        node_list = node_list || this.selected;
        var trees = [];
        relation = relation || "root";
        _.each(node_list, function(node){
            var parents = [];
            var children = [];
            switch(relation){
                case "root":
                    parents = self.tree_collection.get(node).get('prerequisite');
                    children = self.tree_collection.get(node).get('is_prerequisite_of');
                    break;
                case "parent":
                    parents = self.flat_prerequisite_tree[node];
                    break;
                case "child":
                    children = self.flat_postrequisite_tree[node];
                    break;
            }
            trees.push({
                "id": node,
                "title": self.tree_collection.get(node).get('title'),
                "parents": self.get_simplified_tree(parents, "parent"),
                "children": self.get_simplified_tree(children, "child")
            });
        });
        return trees;
    };
}
var PrereqTree = new PrerequisiteTree();

var RelatedModalView = BaseViews.BaseModalView.extend({
    template: require("./hbtemplates/related_modal.handlebars"),

    initialize: function(options) {
        _.bindAll(this, "close_prerequisites");
        this.onselect = options.onselect;
        this.parent_view = options.parent_view;
        this.collection = options.collection;
        this.views_to_update = options.views_to_update;
        this.modal = true;
        this.render(this.close, {});
        this.related_view = new RelatedView({
            el: this.$(".modal-body"),
            onselect: this.close_prerequisites,
            modal : this,
            model:this.model,
            views_to_update: this.views_to_update,
            collection: this.collection
        });
    },
    close_prerequisites:function(prerequisite_collection){
      this.onselect(prerequisite_collection, this.views_to_update);
      this.close();
    }
});

var RelatedView = BaseViews.BaseListView.extend({
    template: require("./hbtemplates/related_dialog.handlebars"),
    onselect:null,
    lists: [],

    initialize: function(options) {
        this.modal = options.modal;
        this.selected_collection = options.collection;
        this.collection = new Models.ContentNodeCollection();
        this.onselect = options.onselect;
        this.views_to_update = options.views_to_update;
        this.lists = [];
        this.render();
    },
    events:{
        'click .view_tree': 'show_tree'
    },
    render: function() {
        this.$el.html(this.template());
        var self = this;
        this.selected_collection.get_prerequisites().then(function(nodes){
            self.collection.get_all_fetch_simplified(window.current_channel.get('main_tree').children).then(function(collection){
                self.collection = collection;
                if(self.collection.length > 0){
                    PrereqTree.set(nodes.prerequisite_mapping, nodes.postrequisite_mapping, self.selected_collection, nodes.prerequisite_tree_nodes);
                    self.relatedList = new RelatedList({
                        model: null,
                        el: self.$(".select_main_box"),
                        collection: self.collection,
                        parent_node_view: null,
                        container: self
                    });
                }else{
                    self.$(".empty_default").text("No content found");
                }
            });
        });
    },
    update_count:function(skip_update){
        var prerequisite_collection = this.get_selected_collection();
        var count = this.relatedList.get_metadata();
        this.$("#select_file_count").html(count + " Prerequisite" + ((count == 1)? "" : "s"));
        if(!skip_update){
            this.onselect(prerequisite_collection, this.views_to_update);
        }
    },
    get_selected_collection:function(){
        return new Models.ContentNodeCollection(_.chain(this.lists).pluck('views').flatten().where({'item_to_select': true}).pluck('model').value());
    },
    close_all_popups: function(){
        $('.prerequisite_label').each(function() {
            $(this).popover('hide');
            $(this).removeClass("active-popover");
        });
    },
    show_tree: function(){
        var tree_modal = new PrerequisiteModalView({ collection: this.selected_collection });
    }
});

var RelatedList = BaseViews.BaseListView.extend({
    template: require("./hbtemplates/related_list.handlebars"),
    default_item:">.default-item",
    list_selector: ">.select-list",
    initialize: function(options) {
        this.collection = options.collection;
        this.container = options.container;
        this.count = 0;
        this.parent_node_view = options.parent_node_view;
        this.isdisabled = options.isdisabled;
        this.render();
        this.container.lists.push(this);
    },
    render: function() {
        this.$el.html(this.template({ node : this.model }));
        this.load_content();
    },
    create_new_view:function(model){
        var new_view = new RelatedItem({
            containing_list_view: this,
            model: model,
            checked: (this.parent_node_view)? this.parent_node_view.checked : false,
            container: this.container,
            isdisabled: this.isdisabled
        });
        this.views.push(new_view);
        return new_view;
    },
    check_all:function(checked){
        this.views.forEach(function(entry){
            entry.check_item(checked);
            entry.set_disabled(checked);
            if(entry.subcontent_view){ entry.subcontent_view.check_all(checked); }
        });
    },
    update_count:function(skip_update){
        (this.parent_node_view)? this.parent_node_view.update_count(skip_update) : this.container.update_count(skip_update);
    },
    get_metadata:function(){
        this.count = this.views.reduce(function(sum, entry) { return sum + entry.count; }, 0);
        return this.count;
    }
});

var RelatedItem = BaseViews.BaseListNodeItemView.extend({
    template: require("./hbtemplates/related_list_item.handlebars"),
    tagName: "li",
    className: "select_list_item",
    selectedClass: "select-selected",
    collapsedClass: "glyphicon-triangle-top",
    expandedClass: "glyphicon-triangle-bottom",
    list_selector: ">.select-list",
    item_to_select: false,
    getToggler: function () { return this.$("#menu_toggle_" + this.model.id); },
    getSubdirectory: function () {return this.$("#" + this.id() +"_sub"); },
    'id': function() { return "select_item_" + this.model.get("id"); },
    initialize: function(options) {
        this.bind_node_functions();
        this.containing_list_view = options.containing_list_view;
        this.collection = new Models.ContentNodeCollection();
        this.container = options.container;
        this.checked = options.checked;
        this.isdisabled = options.isdisabled || PrereqTree.is_postrequisite(this.model.id) || PrereqTree.is_selected(this.model.id);
        this.count = 0;
        this.render();
    },
    events: {
        'click .tog_folder' : 'toggle',
        'click >.select_item_wrapper .select_checkbox' : 'handle_checked',
        'click .prerequisite_label': 'show_tree',
        'click .popover': 'cancel_actions'
    },
    render: function() {
        this.$el.html(this.template({
            node:this.model.toJSON(),
            isfolder: this.model.get("kind") === "topic",
            checked: PrereqTree.is_immediate_prerequisite(this.model.id),
            is_prerequisite: PrereqTree.is_prerequisite(this.model.id),
            is_selected: PrereqTree.is_selected(this.model.id),
            is_dependent: this.isdisabled && !PrereqTree.is_selected(this.model.id)
        }));
        var self = this;
        _.defer(function(){
            var is_checked = self.checked;
            self.handle_checked(null, true);
            self.$el.find(".select_checkbox").prop("checked", self.checked);
            self.set_disabled(is_checked || self.isdisabled);
        });
    },
    show_tree: function(event){
        event.stopPropagation();
        event.preventDefault();
        this.container.show_tree();
    },
    handle_checked:function(event, skip_update){
        this.checked =  this.$("#" + this.id() + "_check").is(":checked");
        this.item_to_select = this.checked;
        this.count = (this.checked)? this.model.get("metadata").resource_count : 0;
        if(this.subcontent_view){ this.subcontent_view.check_all(this.checked); }
        this.update_count(skip_update);
    },
    check_item:function(checked){
        this.item_to_select = false;
        this.count = (checked)? this.model.get("metadata").resource_count : 0;
        this.$("#" + this.id() + "_check").prop("checked", checked);
        this.$("#" + this.id() + "_count").text(this.model.get("metadata").resource_count);
        this.$("#" + this.id() + "_count").css("visibility", (checked)? "visible" : "hidden" );
        this.$(".prerequisite_label").css('visibility', (checked)? "visible" : "hidden");
        this.checked = checked;
    },
    load_subfiles:function(){
        var self = this;
        this.collection.get_all_fetch_simplified(this.model.get("children")).then(function(fetched){
            self.subcontent_view = new RelatedList({
                model : self.model,
                el: $(self.getSubdirectory()),
                collection: fetched,
                parent_node_view:self,
                container: self.containing_list_view.container,
                isdisabled: self.isdisabled
            });
        });
    },
    set_disabled:function(isDisabled){
        if(isDisabled){
            this.$(".select_item").addClass("disabled");
            this.$("#" + this.id() + "_check").attr("disabled", "disabled");
        }else{
            this.$(".select_item").removeClass("disabled");
            this.$("#" + this.id() + "_check").removeAttr("disabled");
        }
    },
    update_count:function(skip_update){
        this.count = (this.subcontent_view)? this.subcontent_view.get_metadata() : this.count;
        this.$("#" + this.id() + "_count").css("visibility", (this.count === 0)? "hidden" : "visible");
        this.$("#" + this.id() + "_count").text(this.count);
        this.containing_list_view.update_count(skip_update);
    }
});

var PrerequisiteModalView = BaseViews.BaseModalView.extend({
    template: require("./hbtemplates/prerequisite_modal.handlebars"),

    initialize: function(options) {
        this.modal = true;
        this.collection = options.collection;
        this.render();
    },
    render: function() {
        this.$el.html(this.template({
            header_text: (this.collection.length===1)? this.collection.first().get('title') : this.collection.length + " items"
        }));
        $("body").append(this.el);
        this.$("#prerequisite_modal").modal({show: true});
        this.$("#prerequisite_modal").on("hidden.bs.modal", this.closed_modal);
        this.$("#prerequisite_modal").on("shown.bs.modal", this.create_tree)
    },
    create_tree: function(){
        _.defer(function(){new treeBuilder.flowchart("#prerequisite_tree_wrapper", PrereqTree.get_simplified_tree());})
    }
});

module.exports = {
    RelatedModalView: RelatedModalView,
    RelatedView:RelatedView
}