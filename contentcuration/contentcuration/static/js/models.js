
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

var TopicCollection = Backbone.Collection.extend({
    model: TopicModel
});

var ContentCollection = Backbone.Collection.extend({
    model: ContentModel
});
