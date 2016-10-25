var Models = require("user/../edit_channel/models");
var Backbone = require("backbone");
var UserRouter = require("user/router");

$(function() {
	window.user = new Models.UserModel(window.current_user);
	window.user.fetch({async:false});
});


module.exports = {
	$: $,
	UserRouter: UserRouter,
	Backbone: Backbone
};