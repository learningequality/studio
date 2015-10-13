var Backbone = require("backbone");

var BoilerPlateView = Backbone.View.extend({
	template: require("./hbtemplates/boilerplate.handlebars"),
	initialize: function() {
		this.render();
	},
	render: function() {
		this.$el.html(this.template(this.model));
	}
});

module.exports = {
	BoilerPlateView : BoilerPlateView 
}