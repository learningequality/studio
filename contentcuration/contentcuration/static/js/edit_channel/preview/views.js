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
    current_preview:null,
    initialize: function(options) {
        _.bindAll(this, 'set_preview','toggle_fullscreen', 'load_preview');
        this.presets = new Models.FormatPresetCollection();
        this.render();
    },
    events: {
        'click .preview_btn_tab' : 'set_preview',
        'click .view_fullscreen': 'toggle_fullscreen'
    },
    render: function() {
        this.$el.html(this.template({
            node: (this.model)? this.model.toJSON() : null,
            file: this.current_preview,
            selected_preset: (this.current_preview) ?  window.formatpresets.get(this.current_preview.preset).toJSON() : null,
        }));
    },
    load_preset_dropdown:function(){
        this.presets.sort_by_order();
        this.$("#preview_tabs_dropdown").html(this.tabs_template({
             presets: this.presets.toJSON()
        }));
    },
    set_preview:function(event){
        var self = this;
        _.reject(this.model.get("files"), {preset:{kind:null}}).forEach(function(file){
            var data = (file.attributes)? file.attributes : file;
            var preset_check = (data.preset.id)? data.preset.id : data.preset;
            if(preset_check === event.target.getAttribute("value")){
                self.set_current_preview(data);
                return;
            }
        });
        this.generate_preview(true);
        this.load_preset_dropdown();
    },

    generate_preview:function(force_load){
        var location ="";
        var extension = "";
        if(this.current_preview){
            location = "/" + this.current_preview.file_on_disk;
            extension = this.current_preview.file_format;
            mimetype = this.current_preview.mimetype;

            var preview_template;
            switch (extension){
                case "png":
                case "jpg":
                case "jpeg":
                    preview_template = require("./hbtemplates/preview_templates/image.handlebars");
                    break;
                case "pdf":
                case "PDF":
                case "vtt":
                case "srt":
                    preview_template = require("./hbtemplates/preview_templates/document.handlebars");
                    break;
                case "mp3":
                case "wav":
                    preview_template = require("./hbtemplates/preview_templates/audio.handlebars");
                    break;
                case "mp4":
                    preview_template = require("./hbtemplates/preview_templates/video.handlebars");
                    break;
                case "perseus":
                    preview_template = require("./hbtemplates/preview_templates/exercise.handlebars");
                    break;
                default:
                    preview_template = require("./hbtemplates/preview_templates/default.handlebars");
            }
            this.$("#preview_window").html(preview_template({
                source: location,
                extension:mimetype
            }));
            if(force_load && this.current_preview.recommended_kind === "video"){
                $("#preview_window video").load();
            }
        }
    },

    load_preview:function(){
        if(this.model){
            this.switch_preview(this.model);
        }
    },
    switch_preview:function(model){
        this.model = model;
        if(this.model && this.model.get("kind")!=="topic"){
            var default_preview = null;
            var self = this;
            this.presets.reset();
            this.model.get("files").forEach(function(file){
                var preset = window.formatpresets.get((file.attributes)? file.get("preset") : file.preset)
                if(preset.get("kind")){
                    if(!default_preview || preset.get("order") === 1){
                        default_preview = file;
                    }
                    self.presets.add(preset);
                }
            });
            this.load_preset_dropdown();
            this.set_current_preview(default_preview);
            this.generate_preview(true);
        }
    },
    set_current_preview:function(file){
        if(file){
            this.current_preview = file;
            if(this.current_preview.attributes){
                this.current_preview = this.current_preview.toJSON();
            }
            $("#preview_format_switch").text(this.presets.get(this.current_preview.preset).get("readable_name"));
        }
    },
    toggle_fullscreen:function(){
        var elem = document.getElementById("preview_content_main");

        if(this.$(".view_fullscreen").text() === "Show Fullscreen"){
            $(elem).addClass("preview_on");
            if (elem.requestFullscreen) {
              elem.requestFullscreen();
            } else if (elem.msRequestFullscreen) {
              elem.msRequestFullscreen();
            } else if (elem.mozRequestFullScreen) {
              elem.mozRequestFullScreen();
            } else if (elem.webkitRequestFullscreen) {
              elem.webkitRequestFullscreen();
            }
            this.$(".view_fullscreen").text("Hide Fullscreen");
        }else{
            $(elem).removeClass("preview_on");
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
            this.$(".view_fullscreen").text("Show Fullscreen");
        }
    }
});

module.exports = {
    PreviewModalView:PreviewModalView,
    PreviewView:PreviewView
}