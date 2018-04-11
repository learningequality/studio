var Backbone = require("backbone");
var _ = require("underscore");
var BaseViews = require("edit_channel/views");
var Models = require("edit_channel/models");
var stringHelper = require("edit_channel/utils/string_helper");
require("modal-styles.less");

var NAMESPACE = "preview";
var MESSAGES = {
    "show_fullscreen": "Show Fullscreen",
    "hide_fullscreen": "Hide Fullscreen",
    "select_file": "Select a format to preview.",
    "preview_exercise": "Preview this exercise on the source website",
    "video_error": "Your browser does not support the video tag.",
    "image_error": "Image failed to load"
}

// defining view for the preview modal.
// QUESTION what does the preview modal look like?
var PreviewModalView = BaseViews.BaseModalView.extend({
    // seems to be relying on a "Base View", defined in a require statement above.

    // the view only contains shared logic. Template is specified here
    template: require("./hbtemplates/preview_modal.handlebars"),

    // probably loops into some sort of lifecycle
    initialize: function (options) {
        // need to bind because this is running in the context of the baseModal view
        _.bindAll(this, "close_preview");
        this.modal = true; // ?
        // base view contains a render function, takes a "close" argument. Also an object, "node" key?
        // FLAG: special format for data passed into modal?
        this.render(this.close_preview, { node: this.model.toJSON() });

        // QUESTION does the "base" modal view have a custom check for this? Or is this just to bind the data?
        // initialize a new Preview view, defined below. Tell it to populate a specific el
        this.preview_view = new PreviewView({
            model: this.model,
            el: this.$(".modal-body"),
        });

        // QUESTION what does this do? Probably activate the modal?
        this.preview_view.switch_preview(this.model);
    },
    close_preview: function () {
        this.remove();
    },
});

// contains the logic that actually populates the modal
var PreviewView = BaseViews.BaseView.extend({
    // probably for translations. Defined at the top of this file
    name: NAMESPACE,
    $trs: MESSAGES,
    // Uses a tabs template somewhere in the logic?
    tabs_template: require("./hbtemplates/preview_templates/tabs.handlebars"),
    // Template to be injected in modal, defined above.
    template: require("./hbtemplates/preview_dialog.handlebars"),
    // binds methods so that Backbone can call them later?
    // QUESTION: why are we binding them here again?
    initialize: function (options) {
        // binding functions defined below.
        // QUESTION Why bother with the ones that are used in events anyway?
        _.bindAll(this, 'select_preview', 'toggle_fullscreen','exit_fullscreen');

        // init values used across the methods
        this.current_preview = null;
        this.previewView = null;

        // this.load_preview();
        if (this.model) {
          // this.load_default_value();

          // Init current_preview
          this.current_preview = null;
          // defines preview_files with files that contain `preset.display`
          var preview_files = _.filter(this.model.get("files"), function (f) { return f.preset.display; });
          if (preview_files.length) {
              // Set current preview based off of files defined above.
              this.current_preview = _.min(preview_files, function (file) { return file.preset.order });
          }


          // this.load_preset_dropdown();

          // replace an element in template with tabse_template, defined as a property of this view
          // QUESTION does it have to be a property? Can we define it outside of this context?
          this.$("#preview_tabs_dropdown").html(this.tabs_template({
              // define presets based on another method
              presets: this.load_presets().toJSON()
          }));


        }


        // this.render_preview();
        if (this.current_preview) {
            // QUESTION would it be better to bind this to a property in the model?
            this.$(".preview_format_switch").text(stringHelper.translate(this.current_preview.preset.id));


            // this.generate_preview(true);
            var force_load = true;

            // define data used to create an entirely new view
            var data = {
                content_model: this.model,
                file_model: this.current_preview,
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
                }),
                force_load: force_load && this.model.get('kind') === "video",
                encoding: this.model.get("thumbnail_encoding") && this.model.get("thumbnail_encoding").base64,
                intl_data: this.get_intl_data()
            };
            // create an entirely new previewView if necessary
            if (!this.previewView) {
                data.el = this.$("#preview_window");
                this.previewView = new ItemPreviewView(data);
            } else {
                this.previewView.setData(data);
            }
            this.previewView.render();
        }


        // call render function
        // QUESTION necessary? Seems like it's usually used to attach a model.
        this.render();
        //   load_preview()
        //      if has a model
        //          load_default_value()
        //              define preview_files
        //              define current_preview
        //          load_preset_dropdown()
        //              set preview_tabs_dropdown with tabs_template
        //                load_presets()
        //                  Models.FormatPresetCollection()
        //                      returns a new model in a presets-specific shape
        //   load_preset_dropdown()
        //     redundant? ^
        //   render_preview()
        //      if has a current preview
        //          Set template switch string
        //          generate_preview()
        //              if has current_preview
        //                  if does not have previewView
        //                      create new ItemPreviewView, place in child of template
        //                  else call previewView.setData()
        //                  previewView.render()
    },
    events: {
        'click .preview_btn_tab': 'select_preview',
        'click .view_fullscreen': 'toggle_fullscreen'
    },
    // do we really need to define a render function?
    render: function () {
        // pass data to the template. Why 2 objects rather than 1?
        this.$el.html(
          this.template({
            file: this.current_preview
          }, {
            data: this.get_intl_data()
          })
        );

        // A good convention is to return `this` at the end of render to enable chained calls.
        return this;
    },
    load_presets: function () {
        return new Models.FormatPresetCollection(
            _.where(
                _.pluck(
                    this.model.get("files"), "preset"
                ),
                { 'display': true, 'subtitle': false }
            )
        );
    },
    select_preview: function (event) {
        // called internally
        var selected_preview = _.find(this.model.get('files'), function (file) { return file.preset.id === event.target.getAttribute('value'); });
        this.current_preview = selected_preview;
        // TODO bind this change to an event instead
        this.render();
        var self = this;
        _.defer(function () {
            self.$("iframe").prop("src", function () { return $(this).data("src"); });
        });
    },
    // TODO make reactive to an event
    switch_preview: function (model) {
        // called from outside sources
        this.model = model;
        this.render();
    },
    toggle_fullscreen: function () {
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
    exit_fullscreen: function () {
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
    check_fullscreen: function () {
        return !((document.fullScreenElement !== undefined && document.fullScreenElement === null) ||
            (document.msFullscreenElement !== undefined && document.msFullscreenElement === null) ||
            (document.mozFullScreen !== undefined && !document.mozFullScreen) ||
            (document.webkitIsFullScreen !== undefined && !document.webkitIsFullScreen));
    }
});

var ItemPreviewView = BaseViews.BaseView.extend({
    initialize: function (options) {
        _.bindAll(this, 'render', 'cleanUpVuePreview');

        // init. Can we just set them to null?
        this.vuePreview = null;

        this.setData(options);
        this.render();
    },
    setData: function (options) {
        // to bind all of these manually instead of using `model` directly

        // contains parent's model
        this.content_model = options.content_model;
        this.file_model = options.file_model;
        this.subtitles = options.subtitles;
        this.force_load = options.force_load;
        this.encoding = options.encoding;
        this.intl_data = options.intl_data;
    },
    render: function () {
        // init
        var preview_template;
        var source = this.file_model.storage_url;
        // check file format, define source (if jpeg) and preview template
        // VUE NOT HANDLED HERE
        switch (this.file_model.file_format) {
            case "png":
            case "jpg":
            case "jpeg":
                source = this.encoding || source;
                preview_template = require("./hbtemplates/preview_templates/image.handlebars");
                break;
            case "vtt":
            case "srt":
                preview_template = require("./hbtemplates/preview_templates/document.handlebars");
                break;
            case "pdf":
            case "PDF":
            case "mp3":
            case "mp4":
            case "perseus":
            case "zip":
                break;
            // QUESTION: what does this default template cover?
            default:
                preview_template = require("./hbtemplates/preview_templates/default.handlebars");
        }
        // Was defined above
        if (preview_template) {
            // clear out a vue component if one was present. Are we watching this?
            this.cleanUpVuePreview();
            //  call destroy() on any existing vuePreview (vue component)
            // set vuePreview to null

            // `.handlebars` require returns a function. Specify template vars here.
            this.$el.html(preview_template({
                source: source,
                extension: this.file_model.mimetype,
                checksum: this.file_model.checksum,
                subtitles: this.subtitles
            }, {
                    // QUESTION: what is this second `data` prop?
                    data: this.intl_data
                }));
            if (this.force_load) {
                this.$el.find("video").load();
            }
        // template not defined above, meaning there was no `file_model.file_format` specified. Assume vue
        } else {
            // first use of content_model here. Passed from parent of PreviewModalView.
            // that's probably where vue file's specced
            var kind = this.content_model.get('kind');
            // mock up props here
            var propsData = {
                kind: kind,
                files: [{
                    storage_url: source,
                    extension: this.file_model.file_format,
                    available: true,
                }],
                available: true,
                assessment: kind === 'exercise',
                interactive: false,
                // why are we using `.get` instead of accessing directly?
                // other `*_model`s are probably not Backbone.Models.
                itemId: kind === 'exercise' ? this.content_model.get('assessment_item_ids')[0] : null
            };
            // fresh build of vue component
            if (!this.vuePreview) {
                var ContentRendererComponent = Object.assign(
                    {},
                    // dupe contentRenderer from coreVue. Global var here.
                    // this is a vue component object.
                    window.kolibriGlobal.coreVue.components.contentRenderer
                );
                var Vue = window.kolibriGlobal.lib.vue;

                // QUESTION: why extend?
                var ContentRenderer = Vue.extend(ContentRendererComponent);

                //There's a pseudo-store in global already, if nothing's registered, register this.
                if (!window.kolibriGlobal.coreVue.vuex.store.default.__initialized) {
                    // QUESTION: Do we really need to call registerModule? is it initialized?
                    window.kolibriGlobal.coreVue.vuex.store.default.registerModule();
                }

                // if this works purely with core store, should be fine
                this.vuePreview = new ContentRenderer({
                    propsData: propsData,
                    el: this.$el[0],
                    store: window.kolibriGlobal.coreVue.vuex.store.default,
                });
            } else {
                Object.assign(this.vuePreview, propsData);
            }
        }
    },
    cleanUpVuePreview: function () {
        if (this.vuePreview) {
            this.vuePreview.destroy();
            this.vuePreview = null;
        }
    }
});

// TODO grep for these exports, see where this is being used
module.exports = {
    PreviewModalView: PreviewModalView,
    PreviewView: PreviewView,
    ItemPreviewView: ItemPreviewView
}
