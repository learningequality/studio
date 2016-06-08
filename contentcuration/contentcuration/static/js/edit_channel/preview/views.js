var Backbone = require("backbone");
var _ = require("underscore");
var BaseViews = require("edit_channel/views");
var Models = require("edit_channel/models");
require("uploader.less");

var PreviewView = BaseViews.BaseModalView.extend({
    template: require("./hbtemplates/preview_templates/tabs.handlebars"),
    modal_template: require("./hbtemplates/preview_modal.handlebars"),
    current_preview:null,
    initialize: function(options) {
        _.bindAll(this, 'set_preview');
        this.modal = options.modal;
        this.presets = new Models.FormatPresetCollection();
        this.render();
    },
    events: {
        'click .preview_btn_tab' : 'set_preview'
    },
    render: function() {
        if(this.modal){
            this.$el.html(this.modal_template());
            this.$(".modal-body").html(this.template({
                node: this.model,
                presets: this.presets.toJSON(),
                file: this.current_preview,
                selected_preset: (this.current_preview) ? window.formatpresets.get(this.current_preview.preset) : null
            }));
            this.$el.append(this.el);
            this.$(".modal").modal({show: true});
            this.$el.find(".modal").on("hide.bs.modal", this.close);
        }else{
            this.$el.html(this.template({
                node: this.model,
                presets: this.presets.toJSON(),
                file: this.current_preview,
                selected_preset: (this.current_preview) ?  window.formatpresets.get(this.current_preview.preset) : null
            }));
        }
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
        this.render();
        this.generate_preview();
    },

    generate_preview:function(){
        var location ="";
        var extension = "";
        if(this.current_preview){
            location = this.current_preview.content_copy;
            extension = this.current_preview.file_format;
        }

        var preview_template;
        switch (extension){
            case "png":
            case "jpg":
                preview_template = require("./hbtemplates/preview_templates/image.handlebars");
                break;
            case "pdf":
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
            var self = this;
            if(this.model.get("files")){
                this.model.get("files").forEach(function(file){
                    if(!self.current_preview || self.model.get("files").length === 1){
                        self.set_current_preview(file);
                    }
                    self.presets.add(window.formatpresets.get((file.attributes)? file.get("preset") : file.preset));
                });
            }
            this.render();
            this.generate_preview();
        }
    },
    switch_preview:function(model){
        this.model = model;
        this.load_preview();
    },
    set_current_preview:function(file){
        this.current_preview = file;
        if(this.current_preview.attributes){
            this.current_preview = this.current_preview.attributes;
        }
    }
});

module.exports = {
    PreviewView:PreviewView
}