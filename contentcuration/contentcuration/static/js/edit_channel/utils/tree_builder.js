const d3 = require('d3');
var _ = require('underscore');

var CollapsibleTree = function(elt) {
    var margin = {top: 20, right: 120, bottom: 20, left: 120},
        width = 960 - margin.right - margin.left,
        height = 500 - margin.top - margin.bottom,
        i = 0;

    var tree = d3.layout.tree().size([height, width]);
    var diagonal = d3.svg.diagonal().projection(function(d) { return [d.x, d.y]; });

    var parentdiagonal = d3.svg.diagonal().projection(function(d) { return [d.x, -d.y]; });
    var childdiagonal = d3.svg.diagonal().projection(function(d) { return [d.x, d.y]; });



    var svg = d3.select(elt).append("svg").attr("width", width + margin.right + margin.left)
        .attr("height", height + margin.top + margin.bottom).append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    this.root = {};
    this.update = function(source) {
        this.root = source;
        this.root.x0 = width / 2;
        this.root.y0 = height / 2;

        // Initialize the display to show a few nodes.
        //     root.children.forEach(this.toggleAll);
        // Create the nodes
        this.updateParents(source);
        this.updateChildren(source);
    };
    this.updateParents = function(source){
        var self = this;
        //var duration = d3.event && d3.event.altKey ? 5000 : 500;
        var nodes = tree.nodes(this.root).reverse(); // Compute the new tree layout.
        nodes.forEach(function(d) { d.y = d.depth * 100; }); // Normalize for fixed-depth.
        var node = svg.selectAll("g.node").data(nodes, function(d) { return d.id || (d.id = ++i); }); // Declare the nodes

        // Enter any new nodes at the parent's previous position
        var nodeEnter = node.enter().append("g").attr("class", "node").attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; }); //.on("click", function(d) { self.toggle(d); self.updateParents(d); });
        nodeEnter.append("circle").attr("r", 10); //.style("fill", function(d) { return d._children ? "#915194" : "#fff"; });
        nodeEnter.append("text").attr("x", function(d) { return d.children || d._children ? -13 : 13; })
            .attr("dy", ".35em").attr("text-anchor", function(d) { return d.children || d._children ? "end" : "start"; })
            .text(function(d) { return d.title; }).style("fill-opacity", 1);

        // Create the links
        var links = tree.links(nodes);
        var link = svg.selectAll("path.link").data(links, function(d) { return d.target.id; });
        link.enter().insert("path", "g").attr("class", "link").attr("d", diagonal);
    };

// this.updateParents = function(source) {
    //     // Transition nodes to their new position.
    //     var nodeUpdate = node.transition().duration(duration).attr("transform", function(d) { return "translate(" + d.x + "," + -d.y + ")"; });
    //     nodeUpdate.select("circle").attr("r", 4.5).style("fill", function(d) { return d._children ? "#915194" : "#fff"; });
    //     nodeUpdate.select("text").style("fill-opacity", 1);

    //     // Transition exiting nodes to the parent's new position.
    //     var nodeExit = node.exit().transition().duration(duration).attr("transform", function(d) {
    //         return "translate(" + source.x + "," + source.y + ")";
    //     }).remove();
    //     nodeExit.select("circle").attr("r", 1e-6);
    //     nodeExit.select("text").style("fill-opacity", 1e-6);

    //     var link = vis.selectAll("path.link").data(tree.links(nodes), function(d) { return d.target.id; }); // Update the links

    //     // Enter any new links at the parent's previous position.
    //     link.enter().insert("svg:path", "g").attr("class", "link").attr("d", function(d) {
    //         var o = {x: source.x0, y: source.y0};
    //         return parentdiagonal({source: o, target: o});
    //     }).transition().duration(duration).attr("d", parentdiagonal);

    //     // Transition links to their new position.
    //     link.transition().duration(duration).attr("d", parentdiagonal);

    //     // Transition exiting nodes to the parent's new position.
    //     link.exit().transition().duration(duration).attr("d", function(d) {
    //         var o = {x: source.x, y: source.y};
    //         return parentdiagonal({source: o, target: o});
    //     }).remove();

    //     // Stash the old positions for transition.
    //     _.each(nodes, function(d) { d.x0 = d.x; d.y0 = d.y; });
    // };




    this.updateChildren = function(source){
        var nodes = tree.nodes(this.root).reverse(); // Compute the new tree layout.
        nodes.forEach(function(d) { d.y = d.depth * 100; }); // Normalize for fixed-depth.
        var node = svg.selectAll("g.node").data(nodes, function(d) { return d.id || (d.id = ++i); }); // Declare the nodes

        var nodeEnter = node.enter().append("g").attr("class", "node").attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
        nodeEnter.append("circle").attr("r", 10);
        nodeEnter.append("text").attr("x", function(d) { return d.children || d._children ? -13 : 13; })
            .attr("dy", ".35em").attr("text-anchor", function(d) { return d.children || d._children ? "end" : "start"; })
            .text(function(d) { return d.title; }).style("fill-opacity", 1);

        // Create the links
        var links = tree.links(nodes);
        var link = svg.selectAll("path.link").data(links, function(d) { return d.target.id; });
        link.enter().insert("path", "g").attr("class", "link").attr("d", diagonal);
    };

    // this.updateBoth = function(source) {
    //     var duration = d3.event && d3.event.altKey ? 5000 : 500;
    //     var node = vis.selectAll("g.node").data(nodes, function(d) { return d.id || (d.id = ++i); }); // Update the nodes

    //     // Enter any new nodes at the parent's previous position.
    //     var nodeEnter = node.enter().append("svg:g").attr("class", "node").attr("transform", function(d) {
    //         return "translate(" + source.x0 + "," + source.y0 + ")";
    //     }).on("click", function(d) { that.toggle(d); that.updateBoth(d); });
    //     nodeEnter.append("svg:circle").attr("r", 1e-6).style("fill", function(d) { return d._children ? "#915194" : "#fff"; });
    //     nodeEnter.append("svg:text").attr("x", function(d) { return (that.isParent(d))? -10 : d.children || d._children ? -10 : 10; })
    //         .attr("dy", ".35em").attr("text-anchor", function(d) {
    //             return (that.isParent(d))? "end" : d.children || d._children ? "end" : "start";
    //         }).attr("transform",function(d) { return (d != root)? "rotate(45)" : null; })
    //         .text(function(d) { return d.title; }).style("fill-opacity", 1e-6);

    //     // Transition nodes to their new position.
    //     var nodeUpdate = node.transition().duration(duration).attr("transform", function(d) {
    //         return ( that.isParent(d) )? "translate(" + d.x + "," + -d.y + ")" : "translate(" + d.x + "," + d.y + ")";
    //     });
    //     nodeUpdate.select("circle").attr("r", 4.5).style("fill", function(d) { return d._children ? "#915194" : "#fff"; });
    //     nodeUpdate.select("text").style("fill-opacity", 1);

    //     // Transition exiting nodes to the parent's new position.
    //     var nodeExit = node.exit().transition().duration(duration).attr("transform", function(d) {
    //         return "translate(" + source.x + "," + source.y + ")";
    //     }).remove();
    //     nodeExit.select("circle").attr("r", 1e-6);
    //     nodeExit.select("text").style("fill-opacity", 1e-6);

    //     var link = vis.selectAll("path.link").data(tree.links_parents(nodes).concat(tree.links(nodes)), function(d) { return d.target.id; }); // Update the links
    //     // // Enter any new links at the parent's previous position.
    //     // link.enter().insert("svg:path", "g").attr("class", "link").attr("d", function(d) {
    //     //     var o = {x: source.x0, y: source.y0};
    //     //     return (that.isParent(d.target))? parentdiagonal({source: o, target: o}) : childdiagonal({source: o, target: o});
    //     // }).transition().duration(duration).attr("d", function(d) {
    //     //     return (that.isParent(d.target))? parentdiagonal(d) : childdiagonal(d);
    //     // });

    //     // // Transition links to their new position.
    //     // link.transition().duration(duration).attr("d", function(d) {
    //     //     return (that.isParent(d.target))? parentdiagonal(d) : childdiagonal(d);
    //     // });

    //     // // Transition exiting nodes to the parent's new position.
    //     // link.exit().transition().duration(duration).attr("d", function(d) {
    //     //     var o = {x: source.x, y: source.y};
    //     //     return (that.isParent(d.target))? parentdiagonal({source: o, target: o}) : childdiagonal({source: o, target: o});
    //     // }).remove();

    //     // Stash the old positions for transition.
    //     _.each(nodes, function(d) { d.x0 = d.x; d.y0 = d.y; });
    // };

    // this.updateChildren = function(source) {
    //     var duration = d3.event && d3.event.altKey ? 5000 : 500;
    //     var nodes = tree.nodes(root2).reverse(); // Compute the new tree layout.
    //     nodes.forEach(function(d) { d.y = d.depth * 180; }); // Normalize for fixed-depth.
    //     var node = vis.selectAll("g.node").data(nodes, function(d) { return d.id || (d.id = ++i); }); // Update the nodes

    //     // Enter any new nodes at the parent's previous position.
    //     var nodeEnter = node.enter().append("svg:g").attr("class", "node")
    //         .attr("transform", function(d) { return "translate(" + source.x0 + "," + source.y0 + ")"; })
    //         .on("click", function(d) { that.toggle(d); that.updateChildren(d); });
    //     nodeEnter.append("svg:circle").attr("r", 1e-6).style("fill", function(d) { return d._children ? "#915194" : "#fff"; });
    //     nodeEnter.append("svg:text").attr("x", function(d) { return d.children || d._children ? -10 : 10; })
    //         .attr("dy", ".35em").attr("text-anchor", function(d) { return d.children || d._children ? "end" : "start"; })
    //         .text(function(d) { return d.title; }).style("fill-opacity", 1e-6);

    //     // Transition nodes to their new position.
    //     var nodeUpdate = node.transition().duration(duration).attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
    //     nodeUpdate.select("circle").attr("r", 4.5).style("fill", function(d) { return d._children ? "#915194" : "#fff"; });
    //     nodeUpdate.select("text").style("fill-opacity", 1);

    //     // Transition exiting nodes to the parent's new position.
    //     var nodeExit = node.exit().transition().duration(duration).attr("transform", function(d) {
    //         return "translate(" + source.x + "," + source.y + ")";
    //     }).remove();
    //     nodeExit.select("circle").attr("r", 1e-6);
    //     nodeExit.select("text").style("fill-opacity", 1e-6);

    //     var link = vis.selectAll("path.link").data(tree.links(nodes), function(d) { return d.target.id; }); // Update the links

    //     // Enter any new links at the parent's previous position.
    //     link.enter().insert("svg:path", "g").attr("class", "link").attr("d", function(d) {
    //         var o = {x: source.x0, y: source.y0};
    //         return childdiagonal({source: o, target: o});
    //     }).transition().duration(duration).attr("d", childdiagonal);

    //     // Transition links to their new position.
    //     link.transition().duration(duration).attr("d", childdiagonal);

    //     // Transition exiting nodes to the parent's new position.
    //     link.exit().transition().duration(duration).attr("d", function(d) {
    //         var o = {x: source.x, y: source.y};
    //         return childdiagonal({source: o, target: o});
    //     }).remove();

    //     // Stash the old positions for transition.
    //     _.each(nodes, function(d) { d.x0 = d.x; d.y0 = d.y; });
    // };
    // this.isParent = function(node) {
    //     if( node.parent && node.parent != root ) { return this.isParent(node.parent); }
    //     else if( node.isparent ) { return true; }
    //     else { return false; }
    // };
    // this.toggle = function(d) {
    //     if (d.children) {
    //         d._children = d.children;
    //         d.children = null;
    //     } else {
    //         d.children = d._children;
    //         d._children = null;
    //     }
    //     if (d.parents) {
    //         d._parents = d.parents;
    //         d.parents = null;
    //     } else {
    //         d.parents = d._parents;
    //         d._parents = null;
    //     }
    // };
    // this.toggleAll = function(d) {
    //     if (d.children) {
    //         d.children.forEach(that.toggleAll);
    //         that.toggle(d);
    //     }
    //     if (d.parents) {
    //         d.parents.forEach(that.toggleAll);
    //         that.toggle(d);
    //     }
    // }
}


module.exports = {
    CollapsibleTree : CollapsibleTree
}