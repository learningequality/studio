var Backbone = require("backbone");
var _ = require("underscore");
var BaseViews = require("edit_channel/views");
var Models = require("edit_channel/models");
require("information.less");

var NAMESPACE = "information";
var MESSAGES = {
    "copied": "Copied!",
    "copy_failed": "Copy Failed",
    "learn_more": "LEARN MORE",
    "exercise": "What is an Exercise?",
    "exercise_description": "An exercise contains a set of interactive " +
              "questions that a learner can engage with in Kolibri. They " +
              "will receive instant feedback on whether they answer each " +
              "question correctly or incorrectly. Kolibri will cycle through " +
              "the available questions in an exercise until the Learner achieves mastery.",
    "mastery": "Achieving Mastery",
    "mastery_description": "Kolibri marks an exercise as \"completed\" when the mastery " +
              "criteria is met. Here are the different types of mastery criteria for an exercise:",
    "prereq": "Prerequisites",
    "prereq_description": "Prerequisites help Kolibri recommend content that will allow learners " +
              "to revisit key prior concepts, which may take the form of foundational skills or " +
              "immediately relevant background information. For learners on Kolibri, these items " +
              "will appear alongside the concept for recommended viewing.",
  "published": " Your Channel is Currently Publishing...",
  "channel_publish_id": "Published Channel ID",
  "published_prompt": "You will get an email once the channel finishes publishing. " +
          "Here is your published ID (for importing channel into Kolibri):",
}


var BaseInfoModalView = BaseViews.BaseModalView.extend({
  template: require("./hbtemplates/license_modal.handlebars"),
  modal_id: ".modal",
  className: "information_wrapper",
  name: NAMESPACE,
  $trs: MESSAGES,
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
      this.$el.html(this.template(this.get_render_data(), {
        data: this.get_intl_data()
      }));
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
  get_render_data: function() { return {channel_id: this.data.channel_id, published: this.data.published}; },
  events: {
    'click #modal-copy-btn' : 'copy_publish_id',
    'focus .input-tab-control': 'loop_focus'
  },
  copy_publish_id: function(){
    this.$("#modal-copy-text").focus();
    this.$("#modal-copy-text").select();
    var self = this;
    try {
        document.execCommand("copy");
        this.$("#modal-copy-btn").text(this.get_translation("copied"));
      } catch(e) {
          $("#modal-copy-btn").text(self.get_translation("copy_failed"));
      }
      var self = this;
      setTimeout(function(){
        $("#modal-copy-btn").text(self.get_translation("copy").toUpperCase());
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
