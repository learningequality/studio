var Backbone = require("backbone");
require("boilerplate.less");

var BoilerPlateView = Backbone.View.extend({
	template: require("./hbtemplates/boilerplate.handlebars")
});

module.exports = {
	BoilerPlateView: BoilerPlateView
}