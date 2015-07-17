var Backbone = require("backbone");

var BoilerPlateModel = Backbone.Model.extend({

});

var BoilerPlateCollection = Backbone.Collection.extend({
	model: BoilerPlateModel
});

module.exports = {
	BoilerPlateModel: BoilerPlateModel,
	BoilerPlateCollection: BoilerPlateCollection
}