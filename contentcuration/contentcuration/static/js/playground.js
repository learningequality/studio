var TopicModel = Backbone.Model.extend({
    initialize: function(params) {
        this.children = params.children;
    },
    defaults: {
        this.parent = null,
        this.name = "NewTopic",
    }
});

var ContentModel = Backbone.Model.extend({
    defaults: {
        this.parent = null,
        this.name = "NewContent",
    }
});

var TopicView = Backbone.View.extend({
    render = function() {
        this.$el.html("<li>" + this.model.name + "</li>");
        // Add children in a list here   
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
        // Render top level topics and content
    }
});
