import { BaseView } from 'edit_channel/views';
import { FormatPresetCollection } from 'edit_channel/models';

import PreviewView from './preview';

import PreviewModel from '../models/preview';

import { translate } from 'edit_channel/utils/string_helper';

import { min, where, pluck, defer, find } from 'underscore';

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

        this.listenTo(this.model, 'change', this.prepChildModels);
        this.render();
    },
    prepChildModels() {
      // set formatPresetCollection, based on `files` collection (array of models?)
      this.formatPresetCollection.reset(
        where(
          pluck(this.model.get('files'), "preset"),
          { 'display': true, 'subtitle': false }
        )
      );

      // set up model used in the preview View
      this.previewModel.set({
        // rename this
        content_model: this.model,
        file_model: min(
          this.model.get('files').filter(file => file.preset.display),
          file => file.preset.order
        ),
        subtitles: this.model.get('files').filter(file => {
          var file_json = file.attribute || file;
          var preset_id = (file_json.preset && file_json.preset.name) ? file_json.preset.name : file_json.preset;
          var current_preset = window.formatpresets.get({ id: preset_id });
          return current_preset && current_preset.get("subtitle");
        }),
        force_load: this.model.get('kind') === 'video',
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
        this.$el.html(this.template({
          file: true
        }, {
          data: this.get_intl_data()
        }));

        // set up preview tabs + dd child elements
        this.$("#preview_tabs_dropdown").html(
          this.tabs_template({ presets: this.formatPresetCollection.toJSON() })
        );

        this.$(".preview_format_switch").text(
          translate(this.previewModel.get('file_model').preset.id)
        );

        new PreviewView({
            model: this.previewModel,
            // relies on parts of the template to be there? OR assumes it's a jquery DOM element
            el: this.$('#preview_window'),
        });
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

        this.render();

        // ???
        var self = this;
        defer(function () {
            self.$("iframe").prop("src", function () { return $(this).data("src"); });
        });
    },
    toggle_fullscreen() {
        var elem = document.getElementById("preview_content_main");

        const check_fullscreen = () => {
            return !((document.fullScreenElement !== undefined && document.fullScreenElement === null) ||
                (document.msFullscreenElement !== undefined && document.msFullscreenElement === null) ||
                (document.mozFullScreen !== undefined && !document.mozFullScreen) ||
                (document.webkitIsFullScreen !== undefined && !document.webkitIsFullScreen));
        }

        const exit_fullscreen = () => {
          this.$("#preview_content_main").removeClass('preview_on');
          this.$(".view_fullscreen").html(this.get_translation("show_fullscreen"))
              .attr("title", this.get_translation("show_fullscreen"));
          $(document).off('webkitfullscreenchange');
          $(document).off('mozfullscreenchange');
          $(document).off('fullscreenchange');
          $(document).off('MSFullscreenChange');
        };

        if (!check_fullscreen()) {
            this.$("#preview_content_main").addClass('preview_on');
            this.$(".view_fullscreen").html(this.get_translation("hide_fullscreen"))
                .attr("title", this.get_translation("hide_fullscreen"));
            if (elem.requestFullscreen) {
                elem.requestFullscreen();
            } else if (elem.msRequestFullscreen) {
                elem.msRequestFullscreen();
            } else if (elem.mozRequestFullScreen) {
                elem.mozRequestFullScreen();
            } else if (elem.webkitRequestFullscreen) {
                elem.webkitRequestFullscreen();
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
