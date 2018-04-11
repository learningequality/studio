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

var PreviewModalView = BaseViews.BaseModalView.extend({
    template: require("./hbtemplates/preview_modal.handlebars"),
    initialize: function(options) {
        _.bindAll(this, "close_preview");
        this.modal = true;
        this.render(this.close_preview, {node:this.model.toJSON()});
        this.preview_view = new PreviewView({
            model:this.model,
            el: this.$(".modal-body"),
        });
        this.preview_view.switch_preview(this.model);
    },
    close_preview:function(){
        this.remove();
    },
});

var PreviewView = BaseViews.BaseView.extend({
    name: NAMESPACE,
    $trs: MESSAGES,
    tabs_template: require("./hbtemplates/preview_templates/tabs.handlebars"),
    template: require("./hbtemplates/preview_dialog.handlebars"),
    initialize: function(options) {
        _.bindAll(this, 'select_preview','toggle_fullscreen', 'load_preview', 'exit_fullscreen', 'render_preview');
        this.current_preview = null;
        this.previewView = null;
        this.render();
    },
    events: {
        'click .preview_btn_tab' : 'select_preview',
        'click .view_fullscreen': 'toggle_fullscreen'
    },
    render: function() {
        this.load_preview();
        this.$el.html(this.template({
            file: this.current_preview
        },  {
            data: this.get_intl_data()
        }));
        this.load_preset_dropdown();
        this.render_preview();
    },
    render_preview:function(){
        if(this.current_preview){
            this.$(".preview_format_switch").text(stringHelper.translate(this.current_preview.preset.id));
            this.generate_preview(true);
        }
    },
    load_preview:function(){
        if(this.model){
            this.load_default_value();
            this.load_preset_dropdown();
        }
    },
    load_default_value:function(){
        this.current_preview = null;
        var preview_files = _.filter(this.model.get("files"), function(f){ return f.preset.display; });
        if(preview_files.length){
            this.current_preview = _.min(preview_files, function(file){return file.preset.order});
        }
    },
    load_presets:function(){
        return new Models.FormatPresetCollection(_.where(_.pluck(this.model.get("files"), "preset"), {'display': true, 'subtitle': false}));
    },
    load_preset_dropdown:function(){
        this.$("#preview_tabs_dropdown").html(this.tabs_template({
             presets: this.load_presets().toJSON()
        }));
    },
    select_preview:function(event){
        // called internally
        var selected_preview = _.find(this.model.get('files'), function(file){return file.preset.id === event.target.getAttribute('value');});
        this.current_preview = selected_preview;
        this.render_preview();
        var self = this;
        _.defer(function() {
            self.$("iframe").prop("src", function(){return $(this).data("src");});
        });
    },
    switch_preview:function(model){
        // called from outside sources
        this.model = model;
        this.render();
    },
    generate_preview:function(force_load){
        if(this.current_preview){
            var data = {
                content_model: this.model,
                file_model: this.current_preview,
                subtitles: this.get_subtitles(),
                force_load: force_load && this.model.get('kind') === "video",
                encoding: this.model.get("thumbnail_encoding") && this.model.get("thumbnail_encoding").base64,
                intl_data: this.get_intl_data()
            };
            if (!this.previewView) {
                data.el = this.$("#preview_window");
                this.previewView = new ItemPreviewView(data);
            } else {
                this.previewView.setData(data);
            }
            this.previewView.render();
        }
    },
    get_subtitles:function(){
        var subtitles = [];
        this.model.get("files").forEach(function(file){
            var file_json = (file.attributes)? file.attributes : file;
            var preset_id = (file_json.preset && file_json.preset.name)? file_json.preset.name : file_json.preset;
            var current_preset = window.formatpresets.get({id:preset_id});
            if(current_preset && current_preset.get("subtitle")){
                subtitles.push(file_json);
            }
        });
        return subtitles;
    },
    toggle_fullscreen:function(){
        var elem = document.getElementById("preview_content_main");

        if (!this.check_fullscreen()){
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
        }else{
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
    exit_fullscreen:function(){
        if (!this.check_fullscreen()){
            this.$("#preview_content_main").removeClass('preview_on');
            this.$(".view_fullscreen").html(this.get_translation("show_fullscreen"))
                                        .attr("title", this.get_translation("show_fullscreen"));
            $(document).off('webkitfullscreenchange');
            $(document).off('mozfullscreenchange');
            $(document).off('fullscreenchange');
            $(document).off('MSFullscreenChange');
        }
    },
    check_fullscreen: function() {
        return !((document.fullScreenElement !== undefined && document.fullScreenElement === null) ||
         (document.msFullscreenElement !== undefined && document.msFullscreenElement === null) ||
         (document.mozFullScreen !== undefined && !document.mozFullScreen) ||
         (document.webkitIsFullScreen !== undefined && !document.webkitIsFullScreen));
    }
});

var ItemPreviewView = BaseViews.BaseView.extend({
    initialize: function(options) {
        _.bindAll(this, 'render', 'cleanUpVuePreview');
        this.vuePreview = null;
        this.setData(options);
        this.render();
    },
    setData: function (options) {
        this.content_model = options.content_model;
        this.file_model = options.file_model;
        this.subtitles = options.subtitles;
        this.force_load = options.force_load;
        this.encoding = options.encoding;
        this.intl_data = options.intl_data;
    },
    render: function () {
        var preview_template;
        var source = this.file_model.storage_url;
        switch (this.file_model.file_format){
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
            default:
                preview_template = require("./hbtemplates/preview_templates/default.handlebars");
        }
        if (preview_template) {
                this.cleanUpVuePreview();
                this.$el.html(preview_template({
                    source: source,
                    extension: this.file_model.mimetype,
                    checksum: this.file_model.checksum,
                    subtitles : this.subtitles
                },  {
                    data: this.intl_data
                }));
                if(this.force_load){
                    this.$el.find("video").load();
                }
          } else {
            var kind = this.content_model.get('kind');
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
                itemId: kind === 'exercise' ? this.content_model.get('assessment_item_ids')[0] : null
            };
            if (!this.vuePreview) {
                var ContentRendererComponent = Object.assign({}, window.kolibriGlobal.coreVue.components.contentRenderer);
                var Vue = window.kolibriGlobal.lib.vue;
                var ContentRenderer = Vue.extend(ContentRendererComponent);
                if (!window.kolibriGlobal.coreVue.vuex.store.default.__initialized) {
                    window.kolibriGlobal.coreVue.vuex.store.default.registerModule();
                }
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
    cleanUpVuePreview: function() {
        if (this.vuePreview) {
            this.vuePreview.destroy();
            this.vuePreview = null;
        }
    }
});

module.exports = {
    PreviewModalView:PreviewModalView,
    PreviewView:PreviewView,
    ItemPreviewView: ItemPreviewView
}
