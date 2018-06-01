import { BaseView } from 'edit_channel/views';
import { FormatPresetCollection } from 'edit_channel/models';

import PreviewView from './previewView';

import { translate } from 'edit_channel/utils/string_helper';

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
    this.currentPreviewIndex = 0;
    this.previews = this.getPreviews();


    this.on('changeContentPreview', previewIndex => {
      this.currentPreviewIndex = previewIndex;
      this.render();
    });


    this.on('destroy', () => {
      this.stopListening();
      this.off();

      this.previewView.trigger('destroy');
    });

    this.listenTo(this.model, 'change:files', () => {
      this.previews = this.getPreviews();
      this.previewView.trigger('destroy');
      this.render();
    });

    this.render();
  },
  getPreviews() {
    // array of previewabe files
    const previewableFiles = this.model.get('files').filter(file => {
      if (file.preset && file.preset.display && !(file.preset.subtitle)) {
        return true;
      }
      return false;
      // sort array of previewabe files by preset order
    }).sort(
      (file1, file2) => file1.preset.order - file2.preset.order
    );

    return previewableFiles;
  },
  events: {
    'click .preview_btn_tab': 'selectContentPreview',
    'click .view_fullscreen': 'toggle_fullscreen'
  },
  render() {
    this.previewView = new PreviewView({
      model: this.model,
      previewFile: this.previews[this.currentPreviewIndex],
      intl_data: this.get_intl_data(),
    });

    this.$el.html(
      this.template({ file: true }, { data: this.get_intl_data() })
    );

    this.$fullscreenButton = this.$(".view_fullscreen");

    // set up preview tabs + dd child elements
    this.$("#preview_tabs_dropdown").html(
      this.tabs_template({ previews: this.previews })
    );

    this.$(".preview_format_switch").text(
      translate(this.previews[this.currentPreviewIndex].preset.id)
    );

    // NOTE: replaces the entire view on render.
    this.$('#preview_window').html(this.previewView.el);

    return this;
  },
  selectContentPreview(event) {
    // a <select> seems more appropriate
    const selectedIndex = event.target.getAttribute('value');

    // only change the preview if necessary
    if (selectedIndex !== this.currentPreviewIndex) {
      this.trigger('changeContentPreview', selectedIndex);
    }
  },
  toggle_fullscreen() {
    // useful only for thumbnail previews
    const notFullscreen = () => {
      return ((document.fullScreenElement !== undefined && document.fullScreenElement === null) ||
        (document.msFullscreenElement !== undefined && document.msFullscreenElement === null) ||
        (document.mozFullScreen !== undefined && !document.mozFullScreen) ||
        (document.webkitIsFullScreen !== undefined && !document.webkitIsFullScreen));
    }

    const exit_fullscreen = () => {
      // there must be a better way
      if (notFullscreen()) {
        this.$("#preview_content_main").removeClass('preview_on');
        this.$fullscreenButton.html(this.get_translation("show_fullscreen"))
          .attr("title", this.get_translation("show_fullscreen"));
        $(document).off('webkitfullscreenchange');
        $(document).off('mozfullscreenchange');
        $(document).off('fullscreenchange');
        $(document).off('MSFullscreenChange');
      }
    };
    if (notFullscreen()) {
      this.$("#preview_content_main").addClass('preview_on');
      this.$fullscreenButton.html(
        this.get_translation("hide_fullscreen")
      ).attr("title", this.get_translation("hide_fullscreen"));

      if (this.el.requestFullscreen) {
        this.el.requestFullscreen();
      } else if (this.el.msRequestFullscreen) {
        this.el.msRequestFullscreen();
      } else if (this.el.mozRequestFullScreen) {
        this.el.mozRequestFullScreen();
      } else if (this.el.webkitRequestFullscreen) {
        this.el.webkitRequestFullscreen();
      }
      $(document).on('webkitfullscreenchange', exit_fullscreen);
      $(document).on('mozfullscreenchange', exit_fullscreen);
      $(document).on('fullscreenchange', exit_fullscreen);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
  },
});
