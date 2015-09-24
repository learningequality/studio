var Backbone = require("backbone");

var BoilerPlateModel = Backbone.Model.extend({
});

var BoilerPlateCollection = Backbone.Collection.extend({
	model: BoilerPlateModel
});

var TopicNodeModel = Backbone.Model.extend({
	urlRoot: '/topics',
	//urlRoot: '/preview',

    initialize: function(options) {
        if (this.get("entity_kind")===undefined && this.get("kind")!==undefined){
            this.set("entity_kind", this.get("kind"));
        }
        this.channel = options.channel;
    },
	
	defaults: {
        color1="",
		color2="",
		color3="",
		title="Untitled",
		description=""
    }
});


//to retrieve values: topic.get("title")
//var attributes = topic.toJSON();

var TopicNodeCollection = Backbone.Collection.extend({
	model: TopicNodeModel
});

module.exports = {
	BoilerPlateModel: BoilerPlateModel,
	BoilerPlateCollection: BoilerPlateCollection,
	TopicNodeModel: TopicNodeModel,
	TopicNodeCollection: TopicNodeCollection
}