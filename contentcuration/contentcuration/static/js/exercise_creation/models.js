var Backbone = require("backbone");
var _ = require("underscore");

var ExerciseModel = Backbone.Model.extend({
	defaults: {
		title: "Exercise"
	},

	urlRoot: function() {
		return window.Urls["exercise-list"]();
	}
});

var ExerciseCollection = Backbone.Collection.extend({
	model: ExerciseModel,

	url: function() {
		return window.Urls["exercise-list"]();
	}
});

var AssessmentItemModel = Backbone.Model.extend({

	urlRoot: function() {
		return window.Urls["assessmentitem-list"]();
	},

	defaults: {
		question: "Question Text",
		answers: "[]"
	},

	initialize: function () {
		if (typeof this.get("answers") !== "object") {
			this.set("answers", new Backbone.Collection(JSON.parse(this.get("answers"))), {silent: true});
		}
	},

	parse: function(response) {
	    if (response !== undefined) {
	    	if (response.answers) {
	    		response.answers = new Backbone.Collection(JSON.parse(response.answers));
	    	}
	    }
	    return response;
	},

	toJSON: function() {
	    var attributes = _.clone(this.attributes);
	    if (typeof attributes.answers !== "string") {
		    attributes.answers = JSON.stringify(attributes.answers.toJSON());
		}
	    return attributes;
	}

});

var AssessmentItemCollection = Backbone.Collection.extend({
	model: AssessmentItemModel,

	save: function() {
        Backbone.sync("update", this, {url: this.model.prototype.urlRoot()});
	}
});

module.exports = {
	ExerciseModel: ExerciseModel,
	ExerciseCollection: ExerciseCollection,
	AssessmentItemModel: AssessmentItemModel,
	AssessmentItemCollection: AssessmentItemCollection
};