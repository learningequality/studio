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

        this.listenTo(this.model, 'change', (event) => {
          console.log('change detected!!!!');
          console.log('change event', event);
          this.prepChildModels();
          this.render();
        });
        this.render();
    },
    prepChildModels() {
      // set formatPresetCollection, based on `files` collection (array of models?)
      this.formatPresetCollection.reset(
        // array of file's presets with display=true and subtitle=false
        where(
          // array of files' presets
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

        this.$previewList = this.$("#preview_tabs_dropdown");
        this.$previewListButton = this.$(".preview_format_switch");
        this.$fullscreenButton = this.$(".view_fullscreen");
        this.$previewSection = this.$('#preview_window');

        // TODO separate renders?
        // or give the switcher its own view?

        // set up preview tabs + dd child elements
        this.$previewList.html(
          this.tabs_template({ presets: this.formatPresetCollection.toJSON() })
        );

        this.$previewListButton.text(
          translate(this.previewModel.get('file_model').preset.id)
        );

        this.$previewSection.html(
          new PreviewView({ model: this.previewModel }).el
        );

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

        this.$previewListButton.text(
          translate(this.previewModel.get('file_model').preset.id)
        );

        this.render();

        // ???
        // var self = this;
        // defer(function () {
        //     self.$("iframe").prop("src", function () { return $(this).data("src"); });
        // });
    },
    // some wonky stuff going on with fullscreen
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
