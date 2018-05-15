import BaseViews from 'edit_channel/views';
import PreviewItemView from './preview_item_view';
import Models from 'edit_channel/models';

import PreviewModel from '../models/preview';

import { translate } from 'edit_channel/utils/string_helper';

import { bindAll, min, where, pluck, defer, find } from 'underscore';

var NAMESPACE = "preview";
var MESSAGES = {
    "show_fullscreen": "Show Fullscreen",
    "hide_fullscreen": "Hide Fullscreen",
    "select_file": "Select a format to preview.",
    "preview_exercise": "Preview this exercise on the source website",
    "video_error": "Your browser does not support the video tag.",
    "image_error": "Image failed to load"
}

export default BaseViews.BaseView.extend({
    // probably for translations. Defined at the top of this file
    name: NAMESPACE,
    $trs: MESSAGES,
    // Template to be injected in modal, defined above.
    template: require("../hbtemplates/preview_dialog.handlebars"),
    tabs_template: require("../hbtemplates/preview_templates/tabs.handlebars"),
    // binds methods so that Backbone can call them later?
    // QUESTION: why are we binding them here again?
    initialize() {
        // binding functions defined below.
        // QUESTION Why bother with the ones that are used in events anyway?
      bindAll(this, 'select_preview', 'toggle_fullscreen','exit_fullscreen', 'check_fullscreen');

        // figure out the current_preview
        const defaultPreviewFile = files => min(
          files.filter(file => file.preset.display),
          file => file.preset.order
        );

        const formatPresets = files => new Models.FormatPresetCollection(
            where(
                pluck(files, "preset"),
                { 'display': true, 'subtitle': false }
            )
        ).toJSON();

        // duping the current model, adding some props that it need not worry about
        this.model = new PreviewModel(Object.assign({
          current_preview: defaultPreviewFile(this.model.get('files')),
          format_presets: formatPresets(this.model.get('files')),
          previewViewData: {
              content_model: this.model,
              file_model: defaultPreviewFile(this.model.get('files')),
              subtitles: (() => {
                  var subtitles = [];
                  this.model.get("files").forEach(function (file) {
                      var file_json = (file.attributes) ? file.attributes : file;
                      var preset_id = (file_json.preset && file_json.preset.name) ? file_json.preset.name : file_json.preset;
                      var current_preset = window.formatpresets.get({ id: preset_id });
                      if (current_preset && current_preset.get("subtitle")) {
                          subtitles.push(file_json);
                      }
                  });
                  return subtitles;
              })(),
              force_load: this.model.get('kind') === "video",
              encoding: this.model.get("thumbnail_encoding") && this.model.get("thumbnail_encoding").base64,
              intl_data: this.get_intl_data()
          },
        }, this.model.toJSON()));

        this.listenTo(this.model, 'change', this.render);
        this.render();
    },
    events: {
        'click .preview_btn_tab': 'select_preview',
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
          this.tabs_template({ presets: this.model.get('format_presets') })
        );

        this.$(".preview_format_switch").text(
          translate(this.model.get('current_preview').preset.id)
        );

        new PreviewItemView(
          Object.assign(this.model.get('previewViewData'), {
            el: this.$('#preview_window')[0]
          })
        );

        return this;
    },
    select_preview(event) {
        // called internally
        var selected_preview = find(this.model.get('files'), function (file) { return file.preset.id === event.target.getAttribute('value'); });
        this.current_preview = selected_preview;
        // TODO bind this change to an event instead
        this.render();
        var self = this;

        defer(function () {
            self.$("iframe").prop("src", function () { return $(this).data("src"); });
        });
    },
    // TODO make reactive to an event
    switch_preview(model) {
        // called from outside sources
        this.model = model;
        this.render();
    },
    toggle_fullscreen() {
        var elem = document.getElementById("preview_content_main");

        if (!this.check_fullscreen()) {
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
            $(document).on('webkitfullscreenchange', this.exit_fullscreen);
            $(document).on('mozfullscreenchange', this.exit_fullscreen);
            $(document).on('fullscreenchange', this.exit_fullscreen);
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
    exit_fullscreen() {
        if (!this.check_fullscreen()) {
            this.$("#preview_content_main").removeClass('preview_on');
            this.$(".view_fullscreen").html(this.get_translation("show_fullscreen"))
                .attr("title", this.get_translation("show_fullscreen"));
            $(document).off('webkitfullscreenchange');
            $(document).off('mozfullscreenchange');
            $(document).off('fullscreenchange');
            $(document).off('MSFullscreenChange');
        }
    },
    check_fullscreen() {
        return !((document.fullScreenElement !== undefined && document.fullScreenElement === null) ||
            (document.msFullscreenElement !== undefined && document.msFullscreenElement === null) ||
            (document.mozFullScreen !== undefined && !document.mozFullScreen) ||
            (document.webkitIsFullScreen !== undefined && !document.webkitIsFullScreen));
    }
});
