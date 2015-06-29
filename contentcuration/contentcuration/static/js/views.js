var TopicView = Backbone.View.extend({
    tagName: "li",

    render: function() {
        $(this.el).append(this.model.name);
        $(this.el).append("<ol class='" + this.model.name + "-ol'></ol>");

        // TODO: Also add subtopics

        for (var child in this.children) {
            var currChild = new ContentView({model: child});
            $(this.el).children("ol." + this.model.name).append(currChild.render()[0]);
        }

        return $(this.el);
    }
});

var ContentView = Backbone.View.extend({
    tagName: "li",

    render: function() {
        $(this.el).append(this.model.name);
        return $(this.el);
    }
});

var DummyTreeView = Backbone.View.extend({
    events: {
        "click button.new-topic-top": "newTopLevelTopic"
    },

    tagName: "ol",
    className: "dummy-tree",

    initialize: function() {
        $(this.el).prepend(
            "<button class='new-topic-top'>New top level topic</button>\n" +
            "<button class='new-content-top'>New top level content</button>");

        $(".dummy-tree-container").append($(this.el));

        this.topicColl = new TopicCollection();
        this.contentColl = new ContentCollection();
        
        this.render();
    },
    
    render: function() {
        this.topicColl.each(function(topic) {
            if (topic.parent == null) {
                var currTopic = new TopicView({model: topic});
                $(this.el).append(currTopic.render()[0]);
            }
        });

        this.contentColl.each(function(content) {
            if (content.parent == null) {
                var currContent = new ContentView({model: content});
                $(this.el).append(currContent.render()[0]);
            }
        });
    },

    newTopLevelTopic: function() {
        var newTopic = new TopicModel();
        this.topicColl.add(newTopic);
        this.render();
    },

    newTopLevelContent: function() {
        var newContent = new ContentModel();
        this.contentColl.add(newContent);
        this.render();
    }
});