var Backbone = require("backbone");
var _ = require("underscore");
var BaseViews = require("edit_channel/views");
var Models = require("edit_channel/models");
require("modal-styles.less");

var PreviewView = BaseViews.BaseModalView.extend({
    tabs_template: require("./hbtemplates/preview_templates/tabs.handlebars"),
    template: require("./hbtemplates/preview_dialog.handlebars"),
    modal_template: require("./hbtemplates/preview_modal.handlebars"),
    current_preview:null,
    initialize: function(options) {
        _.bindAll(this, 'set_preview');
        this.modal = options.modal;
        this.presets = new Models.FormatPresetCollection();
        this.render();
        if(this.modal){
             this.switch_preview(this.model);
        }
    },
    events: {
        'click .preview_btn_tab' : 'set_preview'
    },
    render: function() {
        if(this.modal){
            this.$el.html(this.modal_template({node:this.model.toJSON()}));
            this.$(".modal-body").html(this.template({
                node: this.model,
                presets: this.presets.toJSON(),
                file: this.current_preview,
                selected_preset: (this.current_preview) ? window.formatpresets.get(this.current_preview.preset) : null,
                is_modal:true
            }));
            this.$el.append(this.el);
            this.$(".modal").modal({show: true});
            this.$el.find(".modal").on("hide.bs.modal", this.closePreview);
        }else{
            this.$el.html(this.template({
                node: this.model,
                presets: this.presets.toJSON(),
                file: this.current_preview,
                selected_preset: (this.current_preview) ?  window.formatpresets.get(this.current_preview.preset) : null,
                is_modal:false
            }));
        }
        this.load_preset_dropdown();
    },
    load_preset_dropdown:function(){
        this.$("#preview_tabs_dropdown").html(this.tabs_template({
             presets: this.presets.toJSON()
        }));
    },
    set_preview:function(event){
        var self = this;
        this.model.get("files").forEach(function(file){
            var data = (file.attributes)? file.attributes : file;

            if(data.preset == event.target.getAttribute("value")){
                self.set_current_preview(data);
                return;
            }
        });
        this.load_preset_dropdown();
        this.generate_preview();
    },

    generate_preview:function(){
        var location ="";
        var extension = "";
        if(this.current_preview){
            location = "/" + this.current_preview.file_on_disk;
            extension = this.current_preview.file_format;
        }

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
            default:
                preview_template = require("./hbtemplates/preview_templates/default.handlebars");
        }
        this.$("#preview_window").html(preview_template({
            source: location,
            extension:extension
        }));

    },

    load_preview:function(){
        if(this.model){
            this.generate_preview();
        }
    },
    switch_preview:function(model){
        this.model = model;
        if(this.model){
            var self = this;
            this.presets = new Models.FormatPresetCollection();
             if(this.model.get("files")){
                this.model.get("files").forEach(function(file){
                    self.presets.add(window.formatpresets.get((file.attributes)? file.get("preset") : file.preset));
                });
            }
            this.load_preset_dropdown();
            this.set_current_preview(this.model.get("files")[0]);
            this.generate_preview();
        }
    },
    set_current_preview:function(file){
        this.current_preview = file;
        if(this.current_preview.attributes){
            this.current_preview = this.current_preview.attributes;
        }
         $("#preview_format_switch").text(this.presets.get(this.current_preview.preset).get("readable_name"));
    }
});

module.exports = {
    PreviewView:PreviewView
}