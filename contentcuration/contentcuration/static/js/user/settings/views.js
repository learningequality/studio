var Backbone = require("backbone");
var _ = require("underscore");
var BaseViews = require("user/../edit_channel/views");
var Models = require("user/../edit_channel/models");
require("settings.less");


var BaseSettingsView= BaseViews.BaseView.extend({
    template: require("./hbtemplates/profile.handlebars"),
    options_button: null,

    events:{
        'click #save' : 'save_settings',
        'click #cancel' : 'cancel_settings'
    },

    render: function() {
        $(".settings-option").removeClass("active-option");
        this.options_button.addClass("active-option");
        this.$el.html(this.template({
            user: this.model.toJSON()
        }));
    },
    save_settings:function(){
        console.log("SAVING SETTINGS...")
    },
    cancel_settings:function(){
        console.log("CANCELLING SETTINGS...")
    }
});

var ProfileView = BaseSettingsView.extend({
    template: require("./hbtemplates/profile.handlebars"),
    options_button: $("#profile_option"),

    initialize: function(options) {
        _.bindAll(this, "save_settings", "cancel_settings");
        this.originalData = this.model.toJSON();
        this.render();
    },
});

var AccountView = BaseSettingsView.extend({
    template: require("./hbtemplates/account.handlebars"),
    options_button: $("#account_option"),

    initialize: function(options) {
        _.bindAll(this, "save_settings", "cancel_settings");
        this.originalData = this.model.toJSON();
        this.render();
    },
});

var TokensView = BaseSettingsView.extend({
    template: require("./hbtemplates/tokens.handlebars"),
    options_button: $("#tokens_option"),

    initialize: function(options) {
        _.bindAll(this, "save_settings", "cancel_settings");
        this.originalData = this.model.toJSON();
        this.render();
    }
});

module.exports = {
    ProfileView:ProfileView,
    AccountView:AccountView,
    TokensView:TokensView
}
