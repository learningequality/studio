var _ = require("underscore");
var Backbone = require("backbone");
var Models = require("user/../edit_channel/models");

UserRouter  = Backbone.Router.extend({
	initialize: function(options) {
	    _.bindAll(this, "go_to_profile", "profile", "account", "tokens");
		this.user = new Models.UserModel(window.current_user);
  	},

  	routes: {
  		"" : "go_to_profile",
		"profile": "profile",
		"account": "account",
		"tokens": "tokens",
  	},

  	// Automatically redirect to profile
  	go_to_profile:function(){
  		window.location += "profile";
  	},

	profile: function() {
		var SettingViews = require("user/settings/views");
		var profile_view = new SettingViews.ProfileView ({
			el: $("#settings-page"),
			model: this.user
		});
  	},

	account : function(){
		var SettingViews = require("user/settings/views");
		var account_view = new SettingViews.AccountView ({
			el: $("#settings-page"),
			model: this.user
		});
	},
	tokens : function(){
		var SettingViews = require("user/settings/views");
		var tokens_view = new SettingViews.TokensView ({
			el: $("#settings-page"),
			model: this.user
		});
	},
});

module.exports = UserRouter;