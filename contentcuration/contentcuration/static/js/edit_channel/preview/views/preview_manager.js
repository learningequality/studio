import { BaseView } from 'edit_channel/views';
import { FormatPresetCollection } from 'edit_channel/models';

import PreviewView from './preview';

import PreviewModel from '../models/preview';

import { translate } from 'edit_channel/utils/string_helper';

import { min, where, pluck, find } from 'underscore';

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
        this.formatPresetCollection = new FormatPresetCollection();
        this.previewModel = new PreviewModel();

        // might be able to scope this function here
        this.prepChildModels();

        // Reactivity is handled here. Children do _not_ listen for changes.
        // listenTo should prevent memory leaks
        this.listenTo(this.model, 'change', () => {
          this.prepChildModels();
          this.render();
        });
        this.listenTo(this.previewModel, 'change:file_model', this.render);

        this.render();
    },
    prepChildModels() {
      // set formatPresetCollection, based on `files` collection (array of models?)
      // Backbone.Collection's set method handles deduping
      this.formatPresetCollection.set(
        // array of file's presets with display=true and subtitle=false
        where(
          // array of files' presets
          pluck(this.model.get('files'), "preset"),
          { 'display': true, 'subtitle': false }
        )
      );

      // set up model used in the preview View
      this.previewModel.set({
        // default file to display
        content_model: this.model,
        file_model: min(
          this.model.get('files').filter(file => file.preset.display),
          file => file.preset.order
        ),
        // rename this
        encoding: this.model.get('thumbnail_encoding') && this.model.get('thumbnail_encoding').base64,
        intl_data: this.get_intl_data()
      });
    },
    events: {
        'click .preview_btn_tab': 'selectContentPreview',
        'click .view_fullscreen': 'toggle_fullscreen'
    },
    // do we really need to define a render function?
    render() {
        this.previewView = new PreviewView({ model: this.previewModel });

        this.$el.html(this.template({
          file: true
        }, {
          data: this.get_intl_data()
        }));

        this.$fullscreenButton = this.$(".view_fullscreen");

        // set up preview tabs + dd child elements
        this.$("#preview_tabs_dropdown").html(
          this.tabs_template({ presets: this.formatPresetCollection.toJSON() })
        );

        this.$(".preview_format_switch").text(
          translate(this.previewModel.get('file_model').preset.id)
        );

        // NOTE: replaces the entire view on render.
        this.$('#preview_window').html(this.previewView.el);

        return this;
    },
    selectContentPreview(event) {
        // can refine the "find" process.
        var selected_preview = find(
          this.model.get('files'),
          file => file.preset.id === event.target.getAttribute('value')
        );

        this.previewModel.set({
          file_model: selected_preview
        });
    },
    toggle_fullscreen() {
        const notFullscreen = () => {
            return ((document.fullScreenElement !== undefined && document.fullScreenElement === null) ||
                (document.msFullscreenElement !== undefined && document.msFullscreenElement === null) ||
                (document.mozFullScreen !== undefined && !document.mozFullScreen) ||
                (document.webkitIsFullScreen !== undefined && !document.webkitIsFullScreen));
        }

        const exit_fullscreen = () => {
          // there must be a better way
          if(notFullscreen()){
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
