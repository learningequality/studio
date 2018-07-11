import { BaseView } from 'edit_channel/views';

import PreviewView from './previewView';

import { defer } from 'underscore';
import { contains } from 'jquery';

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
  initialize() {
    this.previewView = null;
    this.filePreviews = null;
    this.exercisePreviews = null;
    this.currentPreview = null;

    const resetPreviews = () => {
      // splitting for a few reasons, chiefly different translation methods
      this.filePreviews = this.getFilePreviews();
      this.exercisePreviews = this.getExercisePreviews();

      // pick the whatever's at the top of the list
      this.currentPreview = this.filePreviews.concat(this.exercisePreviews)[0];
    }

    this.on('update:preview', preview => {
      this.currentPreview = preview;
      this.renderPreview();
    });


    this.listenTo(this.model, 'change:files', () => {
      resetPreviews();
      this.render();
    });

    this.listenTo(this.model, 'change:assessment_items', () => {
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
      return this.model.get('assessment_items').filter(
        // don't include those that haven't been saved.
        // Will break previewer, since there's no perseus JSON
        item => !item.isNew
      );
    }

    return [];
  },
  events: {
    'change .preview-dropdown': 'selectPreview',
  },
  render() {
    this.$el.html(
      this.template({
        filePreviews: this.filePreviews,
        exercisePreviews: this.exercisePreviews,
      }, { data: this.get_intl_data() })
    );

    this.$filePreviews = this.$('.file-previews')[0];
    this.$exercisePreviews = this.$('.exercise-previews')[0];

    this.renderPreview();

    return this;
  },
  renderPreview(){
    if(this.previewView){
      this.previewView.trigger('destroy');
    }

    // passing in `el` option because renderer component often uses `responsiveElement`,
    // a mixin used in Kolibri to have the element's length and width available in JS. It requires
    // DOM context (like its parents) to report dimensions properly.
    this.previewView = new PreviewView({
      model: this.model,
      preview: this.currentPreview,
      intl_data: this.get_intl_data(),
    });

    this.$('#preview_window').html(
      this.previewView.el
    );
  },
  selectPreview(event) {
    const selected = event.target.selectedOptions[0];
    const selectedIndex = selected.getAttribute('value');
    let preview = null;

    if(contains(this.$filePreviews, selected)) {
      preview = this.filePreviews[selectedIndex];
    } else if (contains(this.$exercisePreviews, selected)){
      preview = this.exercisePreviews[selectedIndex];
    }
    this.trigger('update:preview', preview);

  },
});
