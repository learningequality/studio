
var ExerciseModels = require("exercise_creation/models");
var ExerciseViews = require("exercise_creation/views");
var $ = require("jquery");

$(function() {
	// Choose behaviour based on whether we have a list of exercises, or just one exercise
	// bootstrapped into the page by the Django template.
	// Ultimately, this slightly janky behaviour will not be used, except in the alpha release.
	if (window.exercises) {
		var collection = new ExerciseModels.ExerciseCollection(window.exercises);
		var exercise_list_view = new ExerciseViews.ExerciseListView({
			collection: collection,
			el: "#exercise_list"
		});
	} else if (window.exercise) {
		var model = new ExerciseModels.ExerciseModel(exercise);
		var collection = new ExerciseModels.AssessmentItemCollection(assessment_items);
		var exercise_view = new ExerciseViews.ExerciseView({
			model: model,
			collection: collection,
			el: "#exercise"
		});
	}
});