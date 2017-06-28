var Backbone = require("backbone");
var _ = require("underscore");
var BaseViews = require("edit_channel/views");
var Models = require("edit_channel/models");
require("information.less");

var LicenseModalView = BaseViews.BaseModalView.extend({
  template: require("./hbtemplates/license_modal.handlebars"),

  initialize: function(options) {
      this.modal = true;
      this.select_license = options.select_license;
      this.render();
  },

  render: function() {
      this.$el.html(this.template({
          license: this.select_license.toJSON()
      }));
      $("body").append(this.el);
      this.$("#license_modal").modal({show: true});
      this.$("#license_modal").on("hidden.bs.modal", this.closed_modal);
  }
});

var MasteryModalView = BaseViews.BaseModalView.extend({
  template: require("./hbtemplates/mastery_modal.handlebars"),

  initialize: function(options) {
      this.modal = true;
      this.render();
  },

  render: function() {
      this.$el.html(this.template());
      $("body").append(this.el);
      this.$("#mastery_modal").modal({show: true});
      this.$("#mastery_modal").on("hidden.bs.modal", this.closed_modal);
  }
});

var PrerequisiteModalView = BaseViews.BaseModalView.extend({
  template: require("./hbtemplates/prereq_modal.handlebars"),

  initialize: function(options) {
      this.modal = true;
      this.render();
  },

  render: function() {
      this.$el.html(this.template());
      $("body").append(this.el);
      this.$("#prereq_modal").modal({show: true});
      this.$("#prereq_modal").on("hidden.bs.modal", this.closed_modal);
  }
});

module.exports = {
    LicenseModalView: LicenseModalView,
    MasteryModalView:MasteryModalView,
    PrerequisiteModalView: PrerequisiteModalView
}