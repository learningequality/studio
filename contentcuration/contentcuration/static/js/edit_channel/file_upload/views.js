var Backbone = require("backbone");
var _ = require("underscore");
var BaseViews = require("edit_channel/views");
var Models = require("edit_channel/models");
var Dropzone = require("dropzone");
var get_cookie = require("utils/get_cookie");
require("uploader.less");
require("dropzone/dist/dropzone.css");

var FileModalView = BaseViews.BaseModalView.extend({
    template: require("./hbtemplates/file_upload_modal.handlebars"),

    initialize: function(options) {
        _.bindAll(this, "close_file_uploader");
        this.callback = options.callback;
        this.parent_view = options.parent_view;
        this.render();
    },

    render: function() {
        this.$el.html(this.template());
        $("body").append(this.el);
        this.$(".modal").modal({show: true});
        this.$(".modal").on("hide.bs.modal", this.close);

        this.file_upload_view = new FileUploadView({
            el: this.$(".modal-body"),
            callback: this.callback,
            container: this
        });
    },
    close_file_uploader:function(){
      this.callback(this.file_upload_view.file_list);
        this.file_list = [];
      this.close();
    }
});

var FileUploadView = BaseViews.BaseListView.extend({
    template: require("./hbtemplates/file_upload.handlebars"),
    file_upload_template: require("./hbtemplates/file_upload_dropzone_item.handlebars"),
    callback:null,
    file_list : [],
    acceptedFiles : "image/*,application/pdf,video/*,text/*,audio/*",

    initialize: function(options) {
        _.bindAll(this, "file_uploaded",  "close_file_uploader", "all_files_uploaded", "file_added", "file_removed", "go_to_formats", "go_to_upload");
        this.callback = options.callback;
        this.container = options.container;
        this.uploading = true;
        this.file_list = [];
        this.collection = new Models.FileCollection();
        this.collection.fetch();
        this.render();
        this.nodeCollection = new Models.ContentNodeCollection();
    },
    events:{
      "click .submit_uploaded_files" : "close_file_uploader",
      "click .go_to_formats" : "go_to_formats",
      "click .go_to_upload" : "go_to_upload"
    },

    render: function() {
        this.$el.html(this.template({
            uploading:this.uploading
        }));

        if(this.uploading){
            // TODO parameterize to allow different file uploads depending on initialization.
            this.dropzone = new Dropzone(this.$("#dropzone").get(0), {
                clickable: ["#dropzone", ".fileinput-button"],
                acceptedFiles: this.acceptedFiles,
                url: window.Urls.file_upload(),
                previewTemplate:this.file_upload_template(),
                parallelUploads: 20,
                //autoQueue: false, // Make sure the files aren't queued until manually added
                previewsContainer: "#dropzone", // Define the container to display the previews
                headers: {"X-CSRFToken": get_cookie("csrftoken")}
            });
            this.dropzone.on("success", this.file_uploaded);

            // Only enable the submit upload files button once all files have finished uploading.
            this.dropzone.on("queuecomplete", this.all_files_uploaded);

            // Disable the submit upload files button if a new file is added to the queue.
            this.dropzone.on("addedfile", this.file_added);

            this.dropzone.on("removedfile", this.file_removed);
        }
        this.load_content();
    },
    load_content:function(){
        var list = this.$el.find(".file_list");
        var self = this;
        list.html("");
        var items = this.views;
        this.views = [];
        items.forEach(function(view){
            var new_format_item = new FormatItem({
                el:  view.$el,
                model: view.model,
                default_file: view.default_file,
                containing_list_view : self,
                thumbnail: view.thumbnail,
                presets : view.presets,
                initial : view.initial
            });
            self.views.push(new_format_item);
            list.append(new_format_item.el);
        });
        if(this.views.length > 0){
            this.enable_next();
        }

    },
    file_uploaded: function(file) {
        console.log("FILE FOUND:", file);
        var new_file_data = {
            "data" : file,
            "filename": JSON.parse(file.xhr.response).filename
        }
        this.file_list.push(new_file_data);
        this.collection.fetch({async:false});

        var fileModel = this.collection.findWhere({
            checksum: new_file_data.filename.split(".")[0],
            contentmetadata : null
        });

        var presets = new Models.FormatPresetCollection();

        window.formatpresets.forEach(function(preset){
            if(preset.get("allowed_formats").indexOf(fileModel.get("file_format")) >= 0){
                preset.set("attached_format", null);
                presets.add(preset);
            }
        });

        var node = new Models.ContentNodeModel({
            title : new_file_data.data.name.split(".")[0],
            parent : null,
            children : [],
            kind: (presets.models.length > 0) ? presets.models[0].get("kind") : null,
            license: 1,
            total_file_size : 0,
            tags : []
        });
        this.nodeCollection.create(node, {async:false});
        fileModel.set({
            file_size : new_file_data.data.size,
            contentmetadata: node.id
        });

        var new_format_item = new FormatItem({
            el:  $(file.previewTemplate),
            model: node,
            default_file: fileModel,
            containing_list_view : this,
            thumbnail: $(file.previewTemplate).find(".thumbnail_img").attr("src"),
            presets : presets,
            initial:true
        });

        this.views.push(new_format_item);
    },
    disable_submit: function() {
        this.$(".submit_uploaded_files").attr("disabled", "disabled");
    },
    enable_submit: function() {
        this.$(".submit_uploaded_files").removeAttr("disabled");
    },
    disable_next:function(){
        this.$(".go_to_formats").attr("disabled", "disabled");
    },
    enable_next:function(){
        this.$(".go_to_formats").removeAttr("disabled");
    },
    all_files_uploaded: function() {
        this.enable_next();
    },
    file_added: function(file) {
        this.disable_next();
    },

    file_removed: function(file) {
        this.file_list.splice(this.file_list.indexOf(file), 1);
        if (this.file_list.length === 0) {
            this.disable_next();
        }
    },
    go_to_formats:function(){
        this.container.$("#formats_step_number").addClass("active_number");
        this.uploading = false;
        this.render();
    },
    go_to_upload:function(){
        this.container.$("#formats_step_number").removeClass("active_number");
        this.uploading = true;
        this.render();
    },
    close_file_uploader:function(){
        this.container.close_file_uploader();
    },
    remove_view: function(view){
        this.views.splice(this.views.indexOf(this), 1);
        view.delete_view();
        if(this.views.length == 0){
            this.disable_next();
        }
    }
});

var FormatItem = BaseViews.BaseListNodeItemView.extend({
    template: require("./hbtemplates/file_upload_item.handlebars"),
    className: "format_item row",
    files: [],
    indent: 0,
    'id': function() {
        return "format_item_" + this.model.filename;
    },

    initialize: function(options) {
        _.bindAll(this, 'assign_default_format', 'toggle_formats', 'remove_item');
        this.containing_list_view = options.containing_list_view;
        this.thumbnail = options.thumbnail;
        this.default_file = options.default_file;
        this.files.push(this.default_file);
        this.initial = options.initial;
        this.presets = options.presets;
        this.render();
    },
    events: {
        'change .format_options_dropdown' : 'assign_default_format',
        'click .expand_format_editor' : 'toggle_formats',
        'click .remove_from_dz ' : 'remove_item'
    },
    render: function() {
        this.$el.html(this.template({
            file:this.default_file,
            initial: this.initial,
            presets: this.presets.toJSON(),
            thumbnail:this.thumbnail,
            node: this.model
        }));
        this.$el.data("data", this);
    },
    assign_default_format:function(event){
        this.initial = false;
        var format = this.presets.get(event.target.value);
        format.set("attached_format", this.default_file);
        this.default_file.set("preset", event.target.value);
        this.render();
    },
    toggle_formats:function(event){
        if(this.$el.find(".expand_format_editor").hasClass("glyphicon-triangle-bottom")){
            this.$el.find(".format_editor_list").slideUp();
            this.$el.find(".expand_format_editor").removeClass("glyphicon-triangle-bottom");
            this.$el.find(".expand_format_editor").addClass("glyphicon-triangle-top");
        }else{
            this.$el.find(".format_editor_list").slideDown();
            this.$el.find(".expand_format_editor").removeClass("glyphicon-triangle-top");
            this.$el.find(".expand_format_editor").addClass("glyphicon-triangle-bottom");
        }
    }
});

module.exports = {
    FileUploadView:FileUploadView,
    FileModalView:FileModalView
}