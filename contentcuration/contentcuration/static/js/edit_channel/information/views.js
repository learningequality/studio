var Backbone = require("backbone");
var _ = require("underscore");
var BaseViews = require("edit_channel/views");
var Models = require("edit_channel/models");
require("information.less");

var NAMESPACE = "information";
var MESSAGES = {
    "copied": "Copied!",
    "copy_failed": "Copy Failed",
    "copy": "COPY",
    "learn_more": "LEARN MORE",
    "close": "CLOSE",
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
    "published": "Channel Successfully Published!",
    "published_prompt": "Here is your published ID (for importing channel into Kolibri):",
    "id": "ID:"
}


var BaseInformationView = BaseViews.BaseModalView.extend({
  name: NAMESPACE,
  messages: MESSAGES,
});

var LicenseModalView = BaseInformationView.extend({
  template: require("./hbtemplates/license_modal.handlebars"),
  initialize: function(options) {
      this.modal = true;
      this.select_license = options.select_license;
      this.render();
  },

  render: function() {
      this.$el.html(this.template({
          license: this.select_license.toJSON()
      }, {
        data: this.get_intl_data()
      }));
      $("body").append(this.el);
      this.$("#license_modal").modal({show: true});
      this.$("#license_modal").on("hidden.bs.modal", this.closed_modal);
  }
});

var MasteryModalView = BaseInformationView.extend({
  template: require("./hbtemplates/mastery_modal.handlebars"),

  initialize: function(options) {
      this.modal = true;
      this.render();
  },

  render: function() {
      this.$el.html(this.template(null, {
        data: this.get_intl_data()
      }));
      $("body").append(this.el);
      this.$("#mastery_modal").modal({show: true});
      this.$("#mastery_modal").on("hidden.bs.modal", this.closed_modal);
  }
});

var PrerequisiteModalView = BaseInformationView.extend({
  template: require("./hbtemplates/prereq_modal.handlebars"),

  initialize: function(options) {
      this.modal = true;
      this.render();
  },

  render: function() {
      this.$el.html(this.template(null, {
        data: this.get_intl_data()
      }));
      $("body").append(this.el);
      this.$("#prereq_modal").modal({show: true});
      this.$("#prereq_modal").on("hidden.bs.modal", this.closed_modal);
  }
});

var PublishedModalView = BaseInformationView.extend({
  template: require("./hbtemplates/published_modal.handlebars"),

  initialize: function(options) {
      this.channel_id = options.channel_id
      this.modal = true;
      this.render();
  },
  events: {
    'click #modal-copy-btn' : 'copy_publish_id'
  },
  render: function() {
      this.$el.html(this.template({channel_id: this.channel_id}, {
        data: this.get_intl_data()
      }));
      $("body").append(this.el);
      this.$("#published_modal").modal({show: true});
      this.$("#published_modal").on("hidden.bs.modal", this.closed_modal);
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
      setTimeout(function(){
        $("#modal-copy-btn").text(self.get_translation("copy"));
      }, 2500);
  }
});


module.exports = {
    LicenseModalView: LicenseModalView,
    MasteryModalView:MasteryModalView,
    PrerequisiteModalView: PrerequisiteModalView,
    PublishedModalView: PublishedModalView
}