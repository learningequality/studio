var Backbone = require("backbone");

var BoilerPlateModel = Backbone.Model.extend({

});

var BoilerPlateCollection = Backbone.Collection.extend({
	model: BoilerPlateModel
});

// Models
window.TopicNode = Backbone.Model.extend({
    url: function() {
        return ("ALL_TOPICS_URL" in window)? sprintf(ALL_TOPICS_URL, {channel_name: this.channel}) : null;
    },

    initialize: function(options) {
        
    }
});

// Collections
window.TopicCollection = Backbone.Collection.extend({
    model: TopicNode
});

module.exports = {
	BoilerPlateModel: BoilerPlateModel,
	BoilerPlateCollection: BoilerPlateCollection
}