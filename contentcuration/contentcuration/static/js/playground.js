var TopicModel = Backbone.Model.extend({
    initialize: function(params) {
        this.children = params.children;
        this.parent = params.parent;
        this.name = params.name;
    },

    defaults: {
        this.parent = null,
        this.name = "NewTopic",
    }
});

var ContentModel = Backbone.Model.extend({
    initialize: function(params) {
        this.parent = params.parent;
        this.name = params.name;
    },

    defaults: {
        this.parent = null,
        this.name = "NewContent",
    }
});

var TopicView = Backbone.View.extend({
    render = function() {
        this.$el.html("<li>" + this.model.name + "</li>");
        this.$el.html.append("<ol>");

        for (var child in this.children) {
            var currChild = new ContentView({model: child});
            this.$el.html.append(currChild);
            currChild.render();
        }

        this.$el.html.append("</ol>");
    }
});

var ContentView = Backbone.View.extend({
    render = function() {
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
    tagName: "ol",
    className: "test-main-list",
    render: function() {
        for (var topic in TopicCollection) {
            if (topic.parent == null) {
                var currTopic = new TopicView({model: topic});
                this.$el.html.append(currTopic);
                currTopic.render();
            }
        }

        for (var content in TopicCollection) {
            if (content.parent == null) {
                var currContent = new ContentView({model: content});
                this.$el.html.append(currContent);
                currContent.render();
            }
        }
    }
});
