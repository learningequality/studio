require('jsplumb');
var template = require("edit_channel/utils/hbtemplates/tree.handlebars");
var node_template = require("edit_channel/utils/hbtemplates/node.handlebars");
var _ = require('underscore');
        var tree = [{
        'id': 'a',
        'title': 'Item A',
        'children': [
            {
                'id': 'b',
                'title': 'Item B'
            },
            {
                'id': 'c',
                'title': 'Item C'
            }
        ],
        'parents': [
            {
                'id': 'd',
                'title': 'Item D',
                'parents': [
                    {
                        'id': 'f',
                        'title': 'Item F',
                        'parents': [
                            {
                                'id': 'h',
                                'title': 'Item H'
                            },
                            {
                                'id': 'i',
                                'title': 'Item I'
                            }
                        ]
                    },
                    {
                        'id': 'g',
                        'title': 'Item G'
                    }
                ]
            },
            {
                'id': 'e',
                'title': 'Item E',
                'parents': [
                    {
                        'id': 'j',
                        'title': 'Item J'
                    },
                    {
                        'id': 'k',
                        'title': 'Item K'
                    }
                ]
            }
        ]
    }]

var flowchart = function(elt, trees) {
    var jsplumb = jsPlumb.getInstance();
    this.get_layer = function(level, is_parent){
        var layer_selector = (is_parent)? "parent_layer_" + level : "child_layer_" + level;
        var html = "<div id='" + layer_selector + "' class='tree_layer'></div>";
        if(!$(elt).find("#" + layer_selector).length)
            (is_parent)? $(elt).prepend(html) : $(elt).append(html);
        return $(elt).find("#" + layer_selector);
    };
    this.connect = function(source, target){
        jsplumb.connect({
            source: "tree_item_" + source.id,
            target: "tree_item_" + target.id,
            connector: "Flowchart",
            anchor: ['Bottom', 'Top'],
            paintStyle:{ stroke:"gray", strokeWidth:4},
            endpoint: "Blank",
            overlays: [["Arrow" , { width:10, length:10, location:1 }]],
        });
    }
    this.build_parents = function(source, level){
        if(source.parents && source.parents.length){
            var selector = "parent_container_" + source.id;
            this.get_layer(level, true).append(template({selector: selector}));
            var self = this;
            _.each(source.parents, function(parent){
                if(!$(elt).find("#tree_item_" + parent.id).length){
                    $(elt).find("#" + selector).append(node_template(parent));
                }
                self.build_parents(parent, level + 1);
            });
            _.each(source.parents, function(parent){self.connect(parent, source);});
        }
    }
    this.build_children = function(source, level){
        if(source.children && source.children.length){
            var selector = "child_container_" + source.id;
            this.get_layer(level, false).append(template({selector: selector}));

            var self = this;
            _.each(source.children, function(child){
                if(!$(elt).find("#tree_item_" + child.id).length){
                    $(elt).find("#" + selector).append(node_template(child));
                }
                self.build_children(child, level + 1);
            });
            _.each(source.children, function(child){ self.connect(source, child); });
        }

    }

    var level = 0;
    this.get_layer(level, true).html(template({selector: "root_container"}));
    var self = this;
    _.each(trees, function(tree) {
        $(elt).find("#root_container").append(node_template(tree))
        self.build_parents(tree, level + 1);
        self.build_children(tree, level + 1);
    });
}

module.exports = {
    flowchart : flowchart
}