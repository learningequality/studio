var TopicModel = Backbone.Model.extend({
    initialize: function(params) {
        // this.children = params.children;
        if (params && params.parent)
            this.parent = params.parent;
        if (params && params.name)
            this.name = params.name;
        // TODO: Random ID for parent tracking?
    },

    defaults: {
        "parent": null,
        "name": "NewTopic"
    }
});

var ContentModel = Backbone.Model.extend({
    initialize: function(params) {
        this.parent = params.parent;
        this.name = params.name;
    },

    defaults: {
        "parent": null,
        "name": "NewContent"
    }
});

var TopicView = Backbone.View.extend({
    render: function() {
        this.$el.html("<li>" + this.model.name + "</li>");
        this.$el.append("<ol>");

        for (var child in this.children) {
            var currChild = new ContentView({model: child});
            this.$el.append(currChild);
            currChild.render();
        }

        this.$el.append("</ol>");
    }
});

var ContentView = Backbone.View.extend({
    render: function() {
        this.$el.html("<li>" + this.model.name + "</li>");
    }
});

var TopicCollection = Backbone.Collection.extend({
    model: TopicModel
});

var ContentCollection = Backbone.Collection.extend({
    model: ContentModel
});

var DummyTreeView = Backbone.View.extend({
    className: "test-main-list",

    events: {
        "click button.new-topic-top": "newTopLevelTopic"
    },

    initialize: function() {
        this.topicColl = new TopicCollection();
        this.contentColl = new ContentCollection();
        
        this.render();
    },
    
    render: function() {
        this.$el.append("<ol></ol>");

        for (var topic in this.topicColl) {
            if (topic.parent == null) {
                var currTopic = new TopicView({model: topic});
                this.$el.append(currTopic);
                currTopic.render();
            }
        }

        for (var content in this.contentColl) {
            if (content.parent == null) {
                var currContent = new ContentView({model: content});
                this.$el.append(currContent);
                currContent.render();
            }
        }
    },

    newTopLevelTopic: function() {
        var newTopic = new TopicModel();
        this.topicColl.add(newTopic);
        this.render();
    }
});

$(document).ready(function() {
    var dummyTree = new DummyTreeView({el: $(".dummy-tree-container")});
});
