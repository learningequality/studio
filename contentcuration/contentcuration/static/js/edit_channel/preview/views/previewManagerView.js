import { BaseView } from 'edit_channel/views';

import PreviewView from './previewView';

import { translate } from 'edit_channel/utils/string_helper';
import { defer } from 'underscore';

var NAMESPACE = "preview";
var MESSAGES = {
  "show_fullscreen": "Show Fullscreen",
  "hide_fullscreen": "Hide Fullscreen",
  "select_file": "Select a format to preview.",
  "preview_exercise": "Preview this exercise on the source website",
  "video_error": "Your browser does not support the video tag.",
  "image_error": "Image failed to load"
}

export default BaseView.extend({
  // probably for translations. Defined at the top of this file
  name: NAMESPACE,
  $trs: MESSAGES,
  // Template to be injected in modal, defined above.
  template: require("../hbtemplates/preview_manager.handlebars"),
  tabs_template: require("../hbtemplates/preview_templates/tabs.handlebars"),
  initialize() {
    const resetPreviews = () => {
      // splitting for a few reasons, chiefly different translation methods
      this.filePreviews = this.getFilePreviews();
      this.exercisePreviews = this.getExercisePreviews();

      // pick the whatever's at the top of the list
      this.currentPreview = this.filePreviews.concat(this.exercisePreviews)[0];
    }

    this.on('setPreview', preview => {
      this.currentPreview = preview;
      this.render();
    });


    this.listenTo(this.model, 'change:files', () => {
      resetPreviews();
      this.render();
    });

    // Trying to keep this logic limited to the scope of preview Views.
    // Using jquery-ui's `remove` event. Applies to widgets, unsure why getting called here

    // Using `defer` to ensure that jquery-ui has had time to bind. Can't use `listenTo`.
    defer(() => this.$el.on("remove", () => {
      this.previewView.trigger('destroy');
      // call stopListening for all events
      this.remove();
      // unbind all `.on`s
      this.off();
    }));

    resetPreviews();

    this.render();
  },
  getFilePreviews() {
    if(this.model.has('files')){
      // array of previewabe files
      return this.model.get('files').filter(file => {
        if (file.preset && file.preset.display && !(file.preset.subtitle)) {
          return true;
        }
        return false;
        // sort array of previewabe files by preset order
      }).sort(
        (file1, file2) => file1.preset.order - file2.preset.order
      );
    }

    return [];
  },
  getExercisePreviews() {
    if(this.model.has('assessment_items')){
      return this.model.get('assessment_items');
    }

    return [];
  },
  events: {
    'click .preview_btn_tab.file_preview': 'selectFilePreview',
    'click .preview_btn_tab.exercise_preview': 'selectExercisePreview',
  },
  render() {
    if(this.previewView){
      this.previewView.trigger('destroy');
    }

    this.$el.html(
      this.template({ file: true }, { data: this.get_intl_data() })
    );

    // set up preview tabs + dd child elements
    this.$("#preview_tabs_dropdown").html(
      this.tabs_template({
         filePreviews: this.filePreviews,
         exercisePreviews: this.exercisePreviews,
       })
    );

    // this.$(".preview_format_switch").text(
    //   translate(this.currentPreview.preset.id)
    // );

    // passing in `el` option because renderer component often uses `responsiveElement`,
    // a mixin used in Kolibri to have the element's length and width available in JS. It requires
    // DOM context (like its parents) to report dimensions properly.
    this.previewView = new PreviewView({
      el: this.$('#preview_window'),
      model: this.model,
      preview: this.currentPreview,
      intl_data: this.get_intl_data(),
    });

    return this;
  },
  selectFilePreview(event) {
    // a <select> seems more appropriate
    const selectedIndex = event.target.getAttribute('value');

    // TODO only change the preview if necessary -- using a "change" event would help with this.
    this.trigger('setPreview', this.filePreviews[selectedIndex]);
  },
  selectExercisePreview(event) {
    // a <select> seems more appropriate
    const selectedIndex = event.target.getAttribute('value');
    console.log('selectedIndex ', selectedIndex);

    // TODO only change the preview if necessary -- using a "change" event would help with this.
    this.trigger('setPreview', this.exercisePreviews[selectedIndex]);
  },
});
