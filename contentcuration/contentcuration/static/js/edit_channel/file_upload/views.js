var Backbone = require("backbone");
var _ = require("underscore");
var Dropzone = require("dropzone");
require("exercises.less");
require("dropzone/dist/dropzone.css");
var get_cookie = require("utils/get_cookie");

var FileUploadView = Backbone.View.extend({
    template: require("./hbtemplates/file_upload.handlebars"),
    modal_template: require("./hbtemplates/file_upload_modal.handlebars"),
    file_list : [],
    initialize: function(options) {
        _.bindAll(this, "file_uploaded",  "close_file_uploader");
        this.callback = options.callback;
        this.modal = options.modal;
        this.render();
    },
    events:{
      "click .submit_uploaded_files" : "close_file_uploader"
    },

    render: function() {
        if (this.modal) {
            this.$el.html(this.modal_template());
            this.$(".modal-body").append(this.template());
            $("body").append(this.el);
            this.$(".modal").modal({show: true});
            this.$(".modal").on("hide.bs.modal", this.close);
        } else {
            this.$el.html(this.template());
        }
        this.file_list = [];

        // TODO parameterize to allow different file uploads depending on initialization.
        this.dropzone = new Dropzone(this.$("#dropzone").get(0), {
            clickable: ["#dropzone", ".fileinput-button"], 
            acceptedFiles: "image/*,application/pdf,video/*,text/*,audio/*", 
            url: window.Urls.file_upload(), 
            headers: {"X-CSRFToken": get_cookie("csrftoken")
          }
        });
        this.dropzone.on("success", this.file_uploaded);
    },
    file_uploaded: function(file) {
        console.log("FILE FOUND:", file);
        this.file_list.push(file);
    },
    close_file_uploader:function(){
      this.callback(this.file_list);
      this.close();
    },
 
    close: function() {
        if (this.modal) {
            this.$(".modal").modal('hide');
        }
        this.remove();
    }
});

module.exports = {
    FileUploadView: FileUploadView
};