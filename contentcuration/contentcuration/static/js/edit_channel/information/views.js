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
    "channel_publish_id": "Published Channel ID",
    "published_prompt": "Copy this channel ID into Kolibri version 0.6.0 and below:",
    "published_token_prompt": "Copy this channel token into Kolibri version 0.7.0 and above:",
    "channel_publish_token": "Published Channel Token",
    "newer_version": "Have a newer version of Kolibri?",
    "older_version": "Have an older version of Kolibri?",
    "get_token": "Get Channel Token",
    "get_id": "Get Channel ID",
    "published_version": "Published Version:",
    "coach_content": "What is content visibility?",
    "coach_description": "This is support content and is visible only to coaches (teachers, facilitators, administrators)",
    "anyone_description": "This content is visible to anyone",
    "role_description": "Content visibility determines what type of Kolibri users can see this content."
}


var BaseInfoModalView = BaseViews.BaseModalView.extend({
  template: require("./hbtemplates/license_modal.handlebars"),
  modal_id: ".modal",
  className: "information_wrapper",
  name: NAMESPACE,
  $trs: MESSAGES,
  get_render_data: function(){ return {}; },
  initialize: function(options) {
      _.bindAll(this, 'loop_focus', 'set_indices', "init_focus", "closed_modal");
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
  get_render_data: function(){ return {
    license: this.data.select_license.toJSON(),
    is_cc: this.data.select_license.get('license_url').includes('creativecommons.org'),
    locale: window.languageCode && window.languageCode.split('-')[0] || 'en'
  }; }
});

var MasteryModalView = BaseInfoModalView.extend({
  template: require("./hbtemplates/mastery_modal.handlebars"),
  modal_id: "#mastery_modal",
});

var RolesModalView = BaseInfoModalView.extend({
  template: require("./hbtemplates/roles_modal.handlebars"),
  modal_id: "#roles_modal",
});


var PrerequisiteModalView = BaseInfoModalView.extend({
  template: require("./hbtemplates/prereq_modal.handlebars"),
  modal_id: "#prereq_modal",
});

var PublishedModalView = BaseInfoModalView.extend({
  template: require("./hbtemplates/published_modal.handlebars"),
  publish_template: require("./hbtemplates/published.handlebars"),
  modal_id: "#published_modal",
  get_id: false,
  render: function() {
      BaseInfoModalView.prototype.render.call(this);
      this.render_id();
  },
  get_render_data: function() {
    return {
      get_id: this.get_id,
      channel: this.data.channel.toJSON()
    };
  },
  events: {
    'click #modal-copy-btn' : 'copy_publish_id',
    'focus .input-tab-control': 'loop_focus',
    'click .toggle_id': 'toggle_id'
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
  },
  toggle_id: function() {
    this.get_id = !this.get_id;
    this.render_id();
  },
  render_id: function() {
    this.$(".modal-content").html(this.publish_template(this.get_render_data(), {
      data: this.get_intl_data()
    }));
    this.init_focus();
  }
});


module.exports = {
    LicenseModalView: LicenseModalView,
    MasteryModalView:MasteryModalView,
    PrerequisiteModalView: PrerequisiteModalView,
    PublishedModalView: PublishedModalView,
    RolesModalView: RolesModalView
}
