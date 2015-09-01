var Backbone = require("backbone");

var ExerciseModel = Backbone.Model.extend({});

var ExerciseCollection = Backbone.Collection.extend({
	model: ExerciseModel,

	url: function() {
		return window.Urls["exercise-list"]()
	}
});

var AssessmentItemModel = Backbone.Model.extend({});

var AssessmentItemCollection = Backbone.Collection.extend({
	model: AssessmentItemModel,

	url: function() {
		return window.Urls["assessmentitem-list"]()
	}
});

module.exports = {
	ExerciseModel: ExerciseModel,
	ExerciseCollection: ExerciseCollection,
	AssessmentItemModel: AssessmentItemModel,
	AssessmentItemCollection: AssessmentItemCollection
};