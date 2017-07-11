var Backbone = require("backbone");
var _ = require("underscore");
var BaseViews = require("edit_channel/views");
var Models = require("edit_channel/models");
require("information.less");

var BaseInfoModalView = BaseViews.BaseModalView.extend({
  template: require("./hbtemplates/license_modal.handlebars"),
  modal_id: ".modal",
  className: "information_wrapper",
  get_render_data: function(){ return {}; },

  initialize: function(options) {
      _.bindAll(this, 'loop_focus', 'set_indices', "init_focus");
      this.modal = true;
      this.data = options;
      this.render();
  },
  events: {
    'focus .input-tab-control': 'loop_focus'
  },
  render: function() {
      this.$el.html(this.template(this.get_render_data()));
      $("body").append(this.el);
      this.$(this.modal_id).modal({show: true});
      this.$(this.modal_id).on("hidden.bs.modal", this.closed_modal);
      this.$(this.modal_id).on("shown.bs.modal", this.init_focus);
  },
  init_focus: function(){
    this.set_indices();
    this.set_initial_focus();
  }
});

var LicenseModalView = BaseInfoModalView.extend({
  template: require("./hbtemplates/license_modal.handlebars"),
  modal_id: "#license_modal",
  get_render_data: function(){ return { license: this.data.select_license.toJSON() }; }
});

var MasteryModalView = BaseInfoModalView.extend({
  template: require("./hbtemplates/mastery_modal.handlebars"),
  modal_id: "#mastery_modal",
});

var PrerequisiteModalView = BaseInfoModalView.extend({
  template: require("./hbtemplates/prereq_modal.handlebars"),
  modal_id: "#prereq_modal",
});

var PublishedModalView = BaseInfoModalView.extend({
  template: require("./hbtemplates/published_modal.handlebars"),
  modal_id: "#published_modal",
  get_render_data: function() { return {channel_id: this.data.channel_id}; },
  events: {
    'click #modal-copy-btn' : 'copy_publish_id',
    'focus .input-tab-control': 'loop_focus'
  },
  copy_publish_id: function(){
    this.$("#modal-copy-text").focus();
    this.$("#modal-copy-text").select();
    try {
        document.execCommand("copy");
        this.$("#modal-copy-btn").text("Copied!");
      } catch(e) {
          $("#modal-copy-btn").text("Copy Failed");
      }
      var self = this;
      setTimeout(function(){
        $("#modal-copy-btn").text("COPY");
        self.set_initial_focus();
      }, 2500);
  }
});


module.exports = {
    LicenseModalView: LicenseModalView,
    MasteryModalView:MasteryModalView,
    PrerequisiteModalView: PrerequisiteModalView,
    PublishedModalView: PublishedModalView
}