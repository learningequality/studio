var Backbone = require("backbone");
var _ = require("underscore");
var BaseViews = require("edit_channel/views");
var Models = require("edit_channel/models");
require("prerequisite.less");
var stringHelper = require("edit_channel/utils/string_helper");
var staticModals = require("edit_channel/information/views");

const PREREQ_LIMIT = 5;

function PrerequisiteTree() {
    var self = this;
    this.prerequisites = {};
    this.postrequisites = {};
    this.prerequisite_list = [];
    this.postrequisite_list = [];
    this.tree_collection = new Models.ContentNodeCollection();
    this.selected = null;
    this.ancestors = [];

    this.is_selected = function(id){ return this.selected === id; };
    this.is_prerequisite = function(id){ return _.contains(this.prerequisite_list, id); };
    this.is_postrequisite = function(id){ return _.contains(this.postrequisite_list, id); };
    this.prerequisite_count = function(){ return this.prerequisite_list.length; };
    this.is_immediate_prerequisite = function(id){ return _.contains(_.keys(this.prerequisites), id); };
    this.is_valid_prerequisite = function(id){ return !this.is_postrequisite(id) && !this.is_selected(id); };
    this.set = function(model){
        this.selected = model.id;
        this.prerequisite_fetch_list = [];
        this.prerequisites = {};
        this.postrequisites = {};
        return new Promise(function(resolve, reject){
            self.tree_collection.get_prerequisites([self.selected], true).then(function(nodes){
                self.tree_collection = nodes.prerequisite_tree_nodes;
                self.ancestors = _.uniq(_.flatten(self.tree_collection.pluck('ancestors')));
                self.update_tree(nodes.prerequisite_mapping, nodes.postrequisite_mapping);
                resolve(true);
            });
        });
    };
    this.update_tree = function(prerequisite_mapping, postrequisite_mapping){
        var self = this;
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
    this.get_immediate_prerequisites = function(){
        return _.keys(this.prerequisites);
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
        node_list = node_list || [this.selected];
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
    this.add_prerequisite = function(model){
        this.prerequisite_fetch_list = _.uniq(this.prerequisite_fetch_list.concat(model.id));
    };
    this.remove_prerequisite = function(model){
        this.prerequisite_fetch_list = _.reject(this.prerequisite_fetch_list, function(id) {return id === model.id;});
        delete this.prerequisites[model.id];
    };
    this.fetch_prerequisites = function(){
        var self = this;
        return new Promise(function(resolve, reject){
            if (self.prerequisite_fetch_list.length === 0){resolve(true);}
            self.tree_collection.get_prerequisites(self.prerequisite_fetch_list, false).then(function(nodes){
                self.tree_collection.add(nodes.prerequisite_tree_nodes.toJSON());
                self.ancestors = _.flatten(self.tree_collection.pluck('ancestors'));
                self.update_tree(nodes.prerequisite_mapping, nodes.postrequisite_mapping);
                resolve(true);
            });
        });

    };
}
var PrereqTree = new PrerequisiteTree();

var PrerequisiteModalView = BaseViews.BaseModalView.extend({
    template: require("./hbtemplates/related_modal.handlebars"),

    initialize: function(options) {
        _.bindAll(this, "close_prerequisites");
        this.onselect = options.onselect;
        this.parent_view = options.parent_view;
        this.collection = options.collection;
        this.views_to_update = options.views_to_update;
        this.modal = true;
        this.render(this.close, {});
        this.related_view = new PrerequisiteView({
            el: this.$(".modal-body"),
            onselect: this.close_prerequisites,
            oncount: options.oncount,
            modal : this,
            model:this.model,
            views_to_update: this.views_to_update,
            collection: this.collection,
            allow_edit: options.allow_edit
        });
    },
    close_prerequisites:function(prerequisite_collection){
      this.onselect(prerequisite_collection, this.views_to_update);
      this.close();
    }
});

var PrerequisiteView = BaseViews.BaseListView.extend({
    template: require("./hbtemplates/selected_dialog.handlebars"),
    onselect:null,
    lists: [],

    initialize: function(options) {
        _.bindAll(this, 'render_selected_view');
        this.modal = options.modal;
        this.collection = window.nodeCollection;
        this.onselect = options.onselect;
        this.oncount = options.oncount;
        this.allow_edit = options.allow_edit;
        this.views_to_update = options.views_to_update;
        this.render();
    },
    render: function() {
        var self = this;
        this.$el.html(this.template({node: this.model.toJSON()}));
        PrereqTree.set(this.model).then(this.render_selected_view);
    },
    render_selected_view: function(){
        this.selectedView = new SelectedView({
            model: this.model,
            container: this,
            collection: this.collection,
            allow_edit: this.allow_edit
        });
        this.$("#selected_view_wrapper").html(this.selectedView.el);
    },
    update_count:function(){
        var prereqlist = PrereqTree.get_immediate_prerequisites();
        this.oncount(prereqlist.length);
    },
    show_tree: function(){
        var tree_modal = new PrerequisiteModalView({ collection: new Models.ContentNodeCollection(this.model) });
    },
    update_prerequisites: function(skip_rendering){
        var self = this;
        PrereqTree.fetch_prerequisites().then(function(){
            var immediate_prereqs = PrereqTree.get_immediate_prerequisites();
            self.oncount(immediate_prereqs.length)
            self.onselect(immediate_prereqs, self.views_to_update);
            if(skip_rendering){
                $(".prereq_add_row").css('display', (immediate_prereqs.length < PREREQ_LIMIT)? "block" : "none");
            } else{
                if(self.selectedView){
                    self.selectedView.remove();
                    delete self.selectedView;
                }
                self.render_selected_view();
            }
            self.open_selected();
        });
    },
    open_related: function(){
        this.$("#selected_view_wrapper").css('display', 'none');
        this.relatedView = new RelatedView({
            model: this.model,
            container: this
        });
        this.$("#related_view_wrapper").html(this.relatedView.el);
    },
    open_selected: function(){
        this.$("#selected_view_wrapper").css('display', 'block');
        if(this.relatedView){
            this.relatedView.remove();
            delete this.relatedView
        }

    }
});

var BasePrerequisiteView = BaseViews.BaseView.extend({
    initialize: function(options) {
        _.bindAll(this, 'render');
        this.modal = options.modal;
        this.model = options.model;
        this.allow_edit = options.allow_edit;
        this.collection = new Models.ContentNodeCollection();
        this.container = options.container;
        this.render();
    },
    events:{
        'click #prereq_about': 'open_help'
    },
    open_help: function(){
        new staticModals.PrerequisiteModalView();
    }
});

var SelectedView = BasePrerequisiteView.extend({
    template: require("./hbtemplates/selected_view.handlebars"),
    render: function() {
        this.$el.html(this.template({allow_edit: this.allow_edit}));
        var self = this;
        // PrereqTree.set(this.model).then(function(){
        self.collection.get_all_fetch_simplified(PrereqTree.get_immediate_prerequisites()).then(function(collection){
            self.selectedList = new SelectedList({
                model: self.model,
                el: self.$("#selected_prerequisite_box"),
                collection: collection,
                container: self.container,
                allow_edit: self.allow_edit
            });
        });
    }
});

var RelatedView = BasePrerequisiteView.extend({
    template: require("./hbtemplates/related_view.handlebars"),
    render: function() {
        var self = this;
        this.$el.html(this.template());
        this.collection.get_all_fetch_simplified([this.model.get('parent')]).then(function(collection){
            self.navigate_to_node(collection.at(0));
        });
    },
    navigate_to_node: function(model){
        if(this.relatedList){
            this.relatedList.remove();
            delete this.relatedList;
        }
        this.relatedList = new RelatedList({
            model: model,
            collection: this.collection,
            container: this.container,
            related_view: this
        });
        this.$("#selector_box").html(this.relatedList.el)
    }
});


var SelectedList = BaseViews.BaseListView.extend({
    template: require("./hbtemplates/selected_list.handlebars"),
    default_item:">.default-item",
    list_selector: "#selected_prerequisites",
    initialize: function(options) {
        this.collection = options.collection;
        this.container = options.container;
        this.allow_edit = options.allow_edit;
        this.render();
    },
    events: {
        'click .add_prereq' : 'open_related'
    },
    render: function() {
        this.$el.html(this.template({
            can_select: PrereqTree.get_immediate_prerequisites().length < PREREQ_LIMIT
        }));
        this.container.update_count()
        this.load_content();
    },
    create_new_view:function(model){
        var new_view = new SelectedItem({
            containing_list_view: this,
            model: model,
            checked: false,
            container: this.container,
            isdisabled: this.isdisabled,
            allow_edit: this.allow_edit
        });
        this.views.push(new_view);
        return new_view;
    },
    open_related: function(){
        this.container.open_related();
    }
});

var RelatedList = BaseViews.BaseListView.extend({
    template: require("./hbtemplates/related_list.handlebars"),
    default_item:".default-item",
    list_selector: ".select-list",
    initialize: function(options) {
        _.bindAll(this, 'navigate_to_node');
        this.collection = options.collection;
        this.container = options.container;
        this.related_view = options.related_view;
        this.render();
    },
    events: {
        'click .cancel_selection' : 'open_selected',
        'click .back_button' : 'go_back_in_tree'
    },
    render: function() {
        var self = this;
        this.$el.html(this.template({
            node: this.model.toJSON(),
            has_parent: this.model.get('ancestors').length > 1
        }));
        var fetchList = _.filter(this.model.get('children'), function(id){return PrereqTree.is_valid_prerequisite(id)});
        this.collection.get_all_fetch_simplified(fetchList).then(function(collection){
            self.load_content(collection);
        });
    },
    create_new_view:function(model){
        var new_view = new RelatedItem({
            containing_list_view: this,
            model: model,
            container: this.container,
            collection: this.collection
        });
        this.views.push(new_view);
        return new_view;
    },
    open_selected: function(){
        this.container.open_selected();
    },
    go_back_in_tree: function(){
        var self = this;
        this.collection.get_all_fetch_simplified([this.model.get('parent')]).then(function(collection){
            self.related_view.navigate_to_node(collection.at(0));
        });
    },
    navigate_to_node: function(model){
        this.related_view.navigate_to_node(model);
    }
});

var BasePrerequisiteItem = BaseViews.BaseListNodeItemView.extend({
    tagName: "div",
    className: "select_list_item container-fluid prereq_row",
    'id': function() { return "select_item_" + this.model.get("id"); },
    initialize: function(options) {
        this.container = options.container;
        this.collection = options.collection;
        this.allow_edit = options.allow_edit;
        this.containing_list_view = options.containing_list_view;
        this.render();
    },
});

var SelectedItem = BasePrerequisiteItem.extend({
    template: require("./hbtemplates/selected_list_item.handlebars"),
    events: {
        'click .remove_prereq': 'remove_prerequisite'
    },
    render: function() {
        this.$el.html(this.template({
            node:this.model.toJSON(),
            allow_edit: this.allow_edit
        }));
    },
    remove_prerequisite: function(){
        PrereqTree.remove_prerequisite(this.model);
        this.remove();
        this.container.update_prerequisites(true);
    }
});


var RelatedItem = BasePrerequisiteItem.extend({
    template: require("./hbtemplates/related_list_item.handlebars"),
    events: {
        'click .topic_item' : 'open_topic',
        'click .select_prereq' : 'select_prerequisite'
    },
    render: function() {
        this.$el.html(this.template({
            node:this.model.toJSON(),
            isfolder: this.model.get("kind") === "topic",
            is_prerequisite: PrereqTree.is_prerequisite(this.model.id)
        }));
    },
    select_prerequisite:function(){
        PrereqTree.add_prerequisite(this.model);
        this.container.update_prerequisites();
    },
    open_topic:function(){
        console.log(this.model)
        this.containing_list_view.navigate_to_node(this.model);
    }
});

module.exports = {
    PrerequisiteModalView: PrerequisiteModalView,
    PrerequisiteView:PrerequisiteView
}