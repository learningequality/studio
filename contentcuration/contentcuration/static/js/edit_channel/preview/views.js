var Backbone = require("backbone");
var _ = require("underscore");
var BaseViews = require("edit_channel/views");
var Models = require("edit_channel/models");
require("modal-styles.less");

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
    tabs_template: require("./hbtemplates/preview_templates/tabs.handlebars"),
    template: require("./hbtemplates/preview_dialog.handlebars"),
    initialize: function(options) {
        _.bindAll(this, 'select_preview','toggle_fullscreen', 'load_preview', 'exit_fullscreen', 'render_preview');
        this.current_preview = null;
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
        }));
        this.load_preset_dropdown();
        this.render_preview();
    },
    render_preview:function(){
        if(this.current_preview){
            this.$(".preview_format_switch").text(this.current_preview.preset.readable_name);
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
        this.$("iframe").prop("src", function(){return $(this).data("src");});
    },
    switch_preview:function(model){
        // called from outside sources
        this.model = model;
        this.render();
    },
    generate_preview:function(force_load){
        if(this.current_preview){
            _.defer(render_preview,
                this.$("#preview_window"),
                this.current_preview,
                this.get_subtitles(),
                force_load && this.model.get('kind') === "video",
                this.model.get("thumbnail_encoding") && this.model.get("thumbnail_encoding").base64
            );
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
            this.$(".view_fullscreen").html("Hide Fullscreen");
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
            this.$(".view_fullscreen").html("Show Fullscreen");
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

function render_preview(el, file_model, subtitles, force_load, encoding){
    var preview_template;
    var source = file_model.storage_url;
    switch (file_model.file_format){
        case "png":
        case "jpg":
        case "jpeg":
            source = encoding || source;
            preview_template = require("./hbtemplates/preview_templates/image.handlebars");
            break;
        case "pdf":
        case "PDF":
        case "vtt":
        case "srt":
            preview_template = require("./hbtemplates/preview_templates/document.handlebars");
            break;
        case "mp3":
            preview_template = require("./hbtemplates/preview_templates/audio.handlebars");
            break;
        case "mp4":
            preview_template = require("./hbtemplates/preview_templates/video.handlebars");
            break;
        case "perseus":
            preview_template = require("./hbtemplates/preview_templates/exercise.handlebars");
            break;
        case "zip":
            preview_template = require("./hbtemplates/preview_templates/html5.handlebars");
            break;
        default:
            preview_template = require("./hbtemplates/preview_templates/default.handlebars");
    }
    el.html(preview_template({
        source: source,
        extension:file_model.mimetype,
        checksum:file_model.checksum,
        subtitles : subtitles
    }));
    if(force_load){
        el.find("video").load();
    }
};

module.exports = {
    PreviewModalView:PreviewModalView,
    PreviewView:PreviewView,
    render_preview: render_preview
}