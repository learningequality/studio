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
        _.bindAll(this, 'set_preview','toggle_fullscreen', 'load_preview', 'exit_fullscreen');
        this.presets = new Models.FormatPresetCollection();
        this.questions = new Models.AssessmentItemCollection();
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
             presets: this.presets.toJSON(),
             questions: this.questions.toJSON()
        }));
    },

    generate_preview:function(force_load){
        if(this.current_preview){
            if(this.current_preview.assessment_id){
                var ExerciseView = require("edit_channel/exercise_creation/views");
                var assessment_item = new Models.AssessmentItemModel(this.current_preview);
                var exercise_item = new ExerciseView.AssessmentItemDisplayView({
                    model: assessment_item,
                    containing_list_view : null,
                    nodeid:(this.model)? this.model.get('id') : null,
                    el: this.$("#preview_window")
                });
            }else{
                extension = this.current_preview.file_format;

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
                    case "zip":
                        preview_template = require("./hbtemplates/preview_templates/html5.handlebars");
                        break;
                    default:
                        preview_template = require("./hbtemplates/preview_templates/default.handlebars");
                }
                this.$("#preview_window").html(preview_template({
                    source: this.current_preview.storage_url,
                    extension:this.current_preview.mimetype,
                    checksum:this.current_preview.checksum,
                    subtitles : this.get_subtitles()
                }));
                if(force_load && this.current_preview.recommended_kind === "video"){
                    $("#preview_window video").load();
                }
            }
        }
    },
    get_subtitles:function(){
        var subtitles = [];
        this.model.get("files").forEach(function(file){
            var file_json = (file.attributes)? file.attributes : file;
            var preset_id = (file_json.preset && file_json.preset.id)? file_json.preset.id : file_json.preset;
            var current_preset = window.formatpresets.get({id:preset_id});
            if(current_preset && current_preset.get("subtitle")){
                subtitles.push(file_json);
            }
        });
        return subtitles;
    },
    load_preview:function(){
        if(this.model){
            this.switch_preview(this.model);
        }
    },
    set_preview:function(event){
        // called internally
        this.load_preview_data(event.target.getAttribute("value"));
        this.generate_preview(true);
    },
    switch_preview:function(model){
        // called from outside sources
        this.model = model;
        if(this.model){
            var self = this;
            this.presets.reset();
            var default_preview = this.load_preview_data(null);
            this.set_current_preview(default_preview);
            this.generate_preview(true);
        }
    },

    load_preview_data:function(load_selected_value){
        var self = this;
        var return_data = null;
        this.model.get("files").forEach(function(file){
            var preset_id = (file.attributes)? file.get("preset") : (file.preset && file.preset.id)? file.preset.id : file.preset;
            var current_preset = window.formatpresets.get({id:preset_id});
            if(current_preset && current_preset.get("display")){
                if (load_selected_value){
                    var data = (file.attributes)? file.attributes : file;
                    var preset_check = (data.preset.id)? data.preset.id : data.preset;
                    if(preset_check === load_selected_value){
                        self.set_current_preview(data);
                        return self.current_preview;
                    }
                }else{
                    if(!return_data || current_preset.get("order") < return_data.preset.order){
                        return_data = file;
                    }
                    self.presets.add(current_preset);
                }
            }
        });
        this.model.get("assessment_items").forEach(function(item){
            var current_assessment = new Models.AssessmentItemModel(item);
            if (load_selected_value){
                if(current_assessment.get('assessment_id') === load_selected_value){
                    self.set_current_preview(current_assessment);
                    return self.current_preview;
                }
            }else{
                if(!return_data || current_assessment.get("order") === 1){
                    return_data = item;
                }
                self.questions.add(current_assessment);
            }
        });
        this.load_preset_dropdown();
        return return_data;
    },

    set_current_preview:function(file){
        if(file){
            this.current_preview = file;
            if(this.current_preview.attributes){
                this.current_preview = this.current_preview.toJSON();
            }
            if (this.current_preview.preset){
                $("#preview_format_switch").text(this.presets.get(this.current_preview.preset).get("readable_name"));
            }else{
                $("#preview_format_switch").text("Question " + this.current_preview.order);
            }

        }
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

module.exports = {
    PreviewModalView:PreviewModalView,
    PreviewView:PreviewView,
}