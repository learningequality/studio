var Backbone = require("backbone");
var _ = require("underscore");
var BaseViews = require("edit_channel/views");
var Models = require("edit_channel/models");
var Dropzone = require("dropzone");
var get_cookie = require("utils/get_cookie");
require("file-uploader.less");
require("dropzone/dist/dropzone.css");
var stringHelper = require("edit_channel/utils/string_helper");
var browserHelper = require("edit_channel/utils/browser_functions");
var dialog = require("edit_channel/utils/dialog");
var ImageViews = require("edit_channel/image/views");

var FileModalView = BaseViews.BaseModalView.extend({
    template: require("./hbtemplates/file_upload_modal.handlebars"),
    initialize: function(options) {
        _.bindAll(this, "close_file_uploader");
        this.render(this.close_file_uploader, {});
        this.file_upload_view = new FileUploadView({
            container: this,
            model:this.model,
            onsave: options.onsave,
            onnew: options.onnew
        });
        this.$(".modal-body").append(this.file_upload_view.el)
    },
    events:{
      "click .go_to_upload" : "go_to_upload",
      "click .go_to_metadata": "go_to_metadata"
    },
    go_to_upload:function(){
        this.file_upload_view.go_to_upload();
    },
    go_to_metadata:function(){
        if(!this.$(".go_to_metadata").hasClass('disabled')){
            this.file_upload_view.go_to_metadata();
        }
    },
    close_file_uploader:function(event){
        var self = this;
        if(this.file_upload_view.collection.length === 0){
            this.close();
        }else{
            dialog.dialog("Unsaved Changes!", "Exiting now will"
            + " undo any new changes. Are you sure you want to exit?", {
                "DON'T SAVE": function(){
                    self.file_upload_view.reset();
                    self.close();
                    $(".modal-backdrop").remove();
                },
                "KEEP OPEN":function(){},
            }, null);
            self.cancel_actions(event);
        }
    }
});

var FileUploadView = BaseViews.BaseView.extend({
    template: require("./hbtemplates/file_upload.handlebars"),
    navigation_template: require("./hbtemplates/file_upload_buttons.handlebars"),
    initialize: function(options) {
        _.bindAll(this,"go_to_upload", "go_to_metadata", "close_file_uploader");
        this.container = options.container;
        this.collection = new Models.ContentNodeCollection();
        this.onsave = options.onsave;
        this.onnew = options.onnew;
        this.switch_view(1);
    },
    events:{
      "click .go_to_metadata": "go_to_metadata"
    },
    go_to_upload:function(){
        this.switch_view(1);
    },
    go_to_metadata:function(){
        this.switch_view(2);
    },
    switch_view:function(stepNumber){
        if(this.current_view){
            this.current_view.remove();
        }
        this.$el.html(this.template());
        this.$("#file_upload_buttons").html(this.navigation_template({
            uploading: stepNumber === 1
        }));
        var data = {
            el: this.$("#file_upload_list_wrapper"),
            container: this,
            model:this.model,
            onsave: this.onsave,
            onnew: this.onnew,
            onclose:this.close_file_uploader,
            new_exercise: false,
            new_content: true,
            new_topic: false,
            collection: this.collection,
            allow_edit: true
        }
        switch(stepNumber){
            case 1:
                $("#metadata_step_number").removeClass("active_number");
                this.current_view = new FileUploadList(data);
                this.current_view.check_completed() ? this.enable_next() : this.disable_next();
                break;
            case 2:
                var UploaderViews = require("edit_channel/uploader/views");
                $("#metadata_step_number").addClass("active_number");
                this.current_view = new UploaderViews.EditMetadataView(data);
                break;
        }
    },
    close_file_uploader:function(){
        this.container.close();
        $(".modal-backdrop").remove();
    },
    disable_next:function(upload_in_progress){
        $(".go_to_metadata").attr("disabled", "disabled");
        $(".go_to_metadata").addClass("disabled");
        this.$(".go_to_metadata").text((upload_in_progress)? "Upload in progress..." : "Add files to continue");
    },
    enable_next:function(){
        $(".go_to_metadata").removeAttr("disabled");
        $(".go_to_metadata").removeClass("disabled");
        this.$(".go_to_metadata").text("EDIT METADATA");
    },
    reset:function(){
        if(this.current_view){ this.current_view.reset(); }
    }
});

var FileUploadList = BaseViews.BaseEditableListView.extend({
    list_selector:"#file_upload_list",
    default_item:"#file_upload_list >.default-item",
    template: require("./hbtemplates/file_upload_upload_list.handlebars"),
    file_upload_template: require("./hbtemplates/file_upload_dropzone_item.handlebars"),

    initialize: function(options) {
        _.bindAll(this, "file_uploaded",  "all_files_uploaded", "file_added", "file_removed","file_failed", "create_dropzone");
        this.container = options.container;
        this.collection = options.collection;
        this.acceptedFiles = this.get_accepted_files();
        this.onsave = options.onsave;
        this.onnew = options.onnew;
        this.uploads_in_progress = 0;
        this.render();
        (this.views.length)? this.enable_next() : this.disable_next(this.uploads_in_progress);
    },
    events:{
      "click #show_uploading" : "show_uploading"
    },
    render: function() {
        this.$el.html(this.template());
        this.load_content(this.collection, "Drop files here to add them to your channel");
        _.defer(this.create_dropzone, 1);
    },
    disable_next:function(upload_in_progress){
        this.container.disable_next(upload_in_progress);
    },
    enable_next:function(){
        this.container.enable_next();
    },
    check_uploads_and_enable:function(){
        if(this.uploads_in_progress <= 0){
            this.enable_next();
        }
    },
    handle_if_empty:function(){
        this.$(this.default_item).css("display", (this.views.length > 0) ? "none" : "block");
        this.disable_next(this.uploads_in_progress > 0);
    },
    get_accepted_files:function(){
        var list = [];
        window.formatpresets.forEach(function(preset){
            if(!preset.get("supplementary") && preset.get('kind') !== 'exercise' && preset.get('kind') !== null){
                list.push(preset.get("associated_mimetypes"));
            }
        });
        return list.join(",");
    },
    create_dropzone: function(){
        this.dropzone = new Dropzone(this.$("#dropzone").get(0), {
            clickable: ["#dropzone", ".fileinput-button"],
            acceptedFiles: this.acceptedFiles,
            url: window.Urls.file_create(),
            previewTemplate:this.file_upload_template(),
            parallelUploads: Math.max(1, browserHelper.get_max_parallel_uploads()),
            previewsContainer: this.list_selector, // Define the container to display the previews
            headers: {"X-CSRFToken": get_cookie("csrftoken")},
            dictInvalidFileType: "This file type is not supported.",
            dictFileTooBig: "Max file size exceeded.",
            dictResponseError: "Error processing request."
        });
        this.dropzone.on("success", this.file_uploaded);
        this.dropzone.on("queuecomplete", this.all_files_uploaded);
        this.dropzone.on("addedfile", this.file_added);
        this.dropzone.on("removedfile", this.file_removed);
        this.dropzone.on("error", this.file_failed);
    },
    create_new_view:function(model){
        var new_format_item = new FormatFormatItem({
            model: model,
            containing_list_view : this
        });
        this.views.push(new_format_item);
        return new_format_item;
    },
    file_uploaded: function(request) {
        var data = JSON.parse(request.xhr.response).node
        var new_node = new Models.ContentNodeModel(JSON.parse(data));
        this.collection.add(new_node);
        var new_view = this.create_new_view(new_node);
        $(request.previewTemplate).html(new_view.el);
        this.uploads_in_progress --;
        this.update_count();
    },
    file_failed:function(file, error){
        this.uploads_in_progress --;
        $(file.previewTemplate).find(".dropzone_remove").css("display", "inline-block");
        if (this.views.length === 0) {
            this.disable_next(this.uploads_in_progress > 0);
        }
    },
    all_files_uploaded: function() {
        this.uploads_in_progress = 0;
        if(this.views.length > 0){
            this.enable_next();
        }
    },
    file_added: function(file) {
        this.uploads_in_progress ++;
        this.$(this.default_item).css("display", "none");
        this.disable_next(this.uploads_in_progress > 0);
    },
    file_removed: function(file) {
        if (this.views.length === 0) {
            this.load_content(this.collection, "Drop files here to add them to your channel");
        }
    },
    remove_view: function(view){
        this.views.splice(this.views.indexOf(this), 1);
        this.collection.remove(view.model);
        view.remove();
        this.handle_if_empty();
        (this.views.length === 0)? this.container.switch_view(1) : this.handle_completed();
    },
    check_completed:function(){
        return _.some(this.views, function(view){ return view.check_for_completion(); });
    },
    show_uploading:function(event){
        var is_checked = this.$("#show_uploading").is(":checked");
        (is_checked)? this.$el.addClass('hide_uploaded') : this.$el.removeClass('hide_uploaded');
        this.$(this.default_item).css("display", (this.$(".format_item").length || is_checked) ? "none" : "block");
        this.$("#file_upload_count").css("display", (is_checked) ? "flex" : "none");
    },
    handle_completed:function(){
        if(this.check_completed() && this.uploads_in_progress === 0){
            this.enable_next();
        }
    },
    update_count:function(){
        $("#file_upload_count").text(this.views.length + (this.views.length===1? " file" : " files") + " uploaded");
    },
    set_uploading:function(is_uploading){
        is_uploading? this.disable_next(true) : this.enable_next();
    }
});

var FormatEditorItem = BaseViews.BaseListNodeItemView.extend({
    allow_edit: true,
    tagName:'div',
    className: "format_item_wrapper files",
    files: null,
    presets:null,
    expandedClass: "glyphicon-triangle-bottom",
    collapsedClass: "glyphicon-triangle-top",
    thumbnail_template: require("./hbtemplates/file_upload_thumbnail.handlebars"),

    getToggler: function () { return this.$(".expand_format_editor"); },
    getSubdirectory: function () {return this.$(".format_editor_list"); },
    'id': function() {
        return this.model.get("id");
    },
    init_collections:function(){
        this.presets = new Models.FormatPresetCollection(_.reject(this.model.get("associated_presets"),function(p) {return !p.display || p.thumbnail;}));
        this.files = new Models.FileCollection(this.model.get("files"));
    },
    check_for_completion:function(){
       return !this.files.findWhere({preset:null});
    },
    sync_file_changes:function(){
        this.model.set("files", this.files.toJSON());
    },
    disable_next:function(){
        this.containing_list_view.disable_next(true);
    },
    enable_next:function(){
        this.containing_list_view.check_uploads_and_enable();
    },
    load_subfiles:function(){
        var data = {
            collection: this.presets,
            files: this.files,
            el: this.$el.find(".format_editor_list"),
            model: this.model,
            content_node_view:this,
            to_delete: this.to_delete,
            allow_edit: this.allow_edit
        }
        this.subcontent_view = new FormatSlotList(data);
        this.update_metadata();
    },
    update_metadata:function(){
        var all_metadata = this.get_metadata();
        this.$(".format_counter").html(all_metadata.count);
        this.$(".main_file_remove").css("display", (all_metadata.main_file_count <=1) ? "none" : "inline");
        this.$(".format_size_text").html(stringHelper.format_size(all_metadata.size));
    },
    get_metadata:function(){
        return _.reduce(this.model.get("files"), function(dict, file){
            return !file.preset.display ? dict :
                {
                    'count': dict.count + 1,
                    'size': dict.size + file.file_size,
                    'main_file_count': dict.main_file_count + !file.preset.supplementary
                };
        }, {'count': 0, 'size': 0, 'main_file_count': 0});
    },
    set_uploading:function(uploading){
        this.containing_list_view.set_uploading(uploading);
    },
    remove_item:function(){
        this.files.forEach(function(file){ if(file) file.destroy(); });
        this.containing_list_view.remove_view(this);
        this.containing_list_view.update_count();
        this.model.destroy();
    },
    set_file_format:function(file, preset){
        file.set({preset: preset.toJSON()});
        this.model.set("files", this.files.toJSON());
        this.containing_list_view.handle_completed();
    },
    create_thumbnail_view:function(onstart, onfinish, onerror){
        if(!this.thumbnail_view){
            var preset_id = _.findWhere(this.model.get('associated_presets'), {thumbnail: true}).id
            this.thumbnail_view = new ImageViews.ThumbnailUploadView({
              model: this.model,
              preset_id: preset_id,
              upload_url: window.Urls.image_upload(),
              acceptedFiles: window.formatpresets.get({id:preset_id}).get('associated_mimetypes').join(','),
              onsuccess: this.set_thumbnail,
              onremove: this.remove_thumbnail,
              onerror: onerror,
              onfinish:onfinish,
              onstart: onstart,
              allow_edit: this.allow_edit,
              is_channel: false
          });
        }
        this.$(".preview_thumbnail").append(this.thumbnail_view.el);
    },
    remove_thumbnail:function(){
        this.set_thumbnail(null);
    },
    set_thumbnail:function(thumbnail){
        var files = _.reject(this.model.get('files'), function(f){ return f.preset.thumbnail; });
        if(thumbnail){
            thumbnail.set('contentnode', this.model.id);
            files = files.concat(thumbnail.toJSON());
        }
        this.model.set('files', files);
    }
});

var FormatInlineItem = FormatEditorItem.extend({
    template: require("./hbtemplates/file_upload_inline_item.handlebars"),
    'id': function() { return this.model.get("id"); },
    initialize: function(options) {
        _.bindAll(this, 'set_thumbnail', 'remove_thumbnail');
        this.bind_node_functions();
        this.originalData = this.model.toJSON();
        this.containing_list_view = options.containing_list_view;
        this.to_delete = new Models.ContentNodeCollection();
        this.allow_edit = options.allow_edit;
        this.init_collections();
        this.render();
        this.listenTo(this.files, "add", this.sync_file_changes);
        this.listenTo(this.files, "change", this.sync_file_changes);
        this.listenTo(this.files, "remove", this.sync_file_changes);
        this.listenTo(this.model, "change:files", this.update_metadata);
    },
    events: {
        'click .remove_from_dz ' : 'remove_item',
    },
    render: function() {
        this.$el.html(this.template({
            node: this.model.toJSON(),
            has_files: this.presets.length,
        }));
        this.load_subfiles();
    },
    unset_model:function(){}
});

var FormatFormatItem = FormatEditorItem.extend({
    template: require("./hbtemplates/file_upload_format_item.handlebars"),

    initialize: function(options) {
        _.bindAll(this, 'update_name', 'remove_item', 'set_thumbnail', 'disable_next', 'enable_next', 'remove_thumbnail');
        this.bind_node_functions();
        this.originalData = this.model.toJSON();
        this.containing_list_view = options.containing_list_view;
        this.init_collections();
        this.render();
        this.listenTo(this.files, "add", this.sync_file_changes);
        this.listenTo(this.files, "change", this.sync_file_changes);
        this.listenTo(this.files, "remove", this.sync_file_changes);
        this.listenTo(this.model, "change:files", this.update_metadata);
    },
    events: {
        'click .remove_from_dz ' : 'remove_item',
        'keyup .name_content_input': 'update_name',
        'paste .name_content_input': 'update_name',
        'click .expand_format_editor' : 'toggle'
    },
    render: function() {
        this.$el.html(this.template({
            presets:this.presets.toJSON(),
            files: this.files.toJSON(),
            node: this.model.toJSON()
        }));
        this.update_metadata();
        this.load_subfiles();
        this.create_thumbnail_view(this.disable_next, this.enable_next, this.enable_next);
    },
    update_name:function(event){
        this.model.set("title", event.target.value);
    }
});

var FormatSlotList = BaseViews.BaseEditableListView.extend({
    template: require("./hbtemplates/file_upload_format_slot_list.handlebars"),
    list_selector:">.preset_list",
    default_item:">.preset_list .default-slot-item",
    initialize: function(options) {
        this.content_node_view = options.content_node_view;
        this.allow_edit = options.allow_edit;
        this.files = options.files;
        this.collection = options.collection;
        if(!this.allow_edit){
            this.collection = new Models.FormatPresetCollection(_.reject(this.files.pluck('preset'),
                function(preset){return preset.thumbnail || !preset.display; }));
        }
        this.render();
    },
    render: function() {
        this.$el.html(this.template());
        this.load_content();
    },
    update_metadata: function(model){
        this.content_node_view.update_metadata();
    },
    create_new_view: function(model){
        var associated_file = this.files.find(function(file){ return file.get("preset").id === model.get("id"); });
        var format_slot = new FormatSlot({
            model: model,
            node : this.model,
            file: associated_file,
            containing_list_view: this,
            allow_edit: this.allow_edit
        });
        this.views.push(format_slot);
        return format_slot;
    },
    set_file_format:function(file, preset, originalFile){
        var to_remove = [];
        this.files.forEach(function(file_obj){
            if(file_obj){
                var preset_check = (file_obj.get("preset").id)? file_obj.get("preset").id : file_obj.get("preset");
                if(preset_check == preset.toJSON().id){
                    to_remove.push(file_obj);
                }
            }
        });
        this.files.remove(to_remove);
        if(file){
            file.set({
                "preset": preset.toJSON(),
                "contentnode": this.model.get("id")
            });
            this.files.push(file);
        }
        if (preset.get('thumbnail')){
            this.content_node_view.set_thumbnail(file);
        }
    },
    set_uploading:function(uploading){
        this.content_node_view.set_uploading(uploading);
    },
    update_metadata:function(){
        this.content_node_view.update_metadata();
    }
});

var FormatSlot = BaseViews.BaseListNodeItemView.extend({
    template: require("./hbtemplates/format_item.handlebars"),
    dropzone_template : require("./hbtemplates/format_dropzone_item.handlebars"),
    upload_in_progress:false,

    'id': function() { return "format_slot_item_" + this.model.get("id"); },
    selector: function() { return this.model.get("id") + "_"  + this.node.get('id') + "_dropzone" + ((this.file)? "_swap" : "") },
    className:"row format_editor_item",
    initialize: function(options) {
        _.bindAll(this, 'remove_item','file_uploaded','file_added','file_removed','file_failed', 'create_dropzone', 'set_file');
        this.containing_list_view = options.containing_list_view;
        this.file = options.file;
        this.originalFile = this.file;
        this.allow_edit = options.allow_edit;
        this.node = options.node;
        this.render();
    },
    events: {
        'click .format_editor_remove ' : 'remove_item'
    },
    render: function() {
        this.$el.html(this.template({
            file: (this.file)? this.file.toJSON() : null,
            preset: this.model.toJSON(),
            selector: this.selector(),
            allow_edit: this.allow_edit,
            src: (this.file)? this.file.get('storage_url') : null
        }));
        if(this.allow_edit){
            _.defer(this.create_dropzone);
        }
    },
    create_dropzone:function(){
        var dz_selector="#" + this.selector();
        var clickables = [dz_selector + " .dz-clickable"];
        if(this.file){
            clickables.push(dz_selector + " .format_editor_file_name");
        }
        var dropzone = new Dropzone(this.$(dz_selector).get(0), {
           clickable: clickables,
           acceptedFiles: this.get_accepted_files(),
           url: window.Urls.file_upload(),
           previewTemplate:this.dropzone_template(),
           maxFiles: 1,
           previewsContainer: dz_selector,
           headers: {
                "X-CSRFToken": get_cookie("csrftoken"),
                "Node" : this.node.get('id'),
                "Preset": this.model.get("id")
            }
        });
        dropzone.on("success", this.file_uploaded);

        // Only enable the submit upload files button once all files have finished uploading.
        dropzone.on("addedfile", this.file_added);
        dropzone.on("removedfile", this.file_removed);
        dropzone.on("error", this.file_failed);
    },
    get_accepted_files:function(){
        var preset = window.formatpresets.findWhere({id: this.model.id});
        return preset.get("associated_mimetypes").join(",");
    },
    file_uploaded:function(file){
        var data = JSON.parse(file.xhr.response).file
        var new_file = new Models.FileModel(JSON.parse(data));
        this.set_file(new_file);
        this.set_uploading(false);
    },
    set_file:function(file){
        var originalFile = this.file;
        this.file = file;
        this.render();
        this.containing_list_view.set_file_format(this.file, this.model, originalFile);
    },
    file_added: function(file) {
        if(this.file){
            this.$(".format_metadata").css("display", "none");
        }
        this.$(".add_format_button").css("display", "none");
        this.set_uploading(true);
    },
    file_removed: function(file) {
        this.$(".add_format_button").css("display", "inline");
    },
    file_failed:function(file, error){
        var self = this;
        dialog.dialog("Error Uploading File", error, {
            "OK":function(){}
        }, function(){
            self.render();
            self.set_uploading(false);
            self.containing_list_view.update_metadata();
        });
    },
    remove_item:function(){
        this.containing_list_view.set_file_format(null, this.model, this.file);
        this.file = null;
        this.render();
    },
    set_uploading:function(uploading){
        this.containing_list_view.set_uploading(uploading);
    }
});


module.exports = {
    FileUploadView:FileUploadView,
    FileModalView:FileModalView,
    FormatInlineItem:FormatInlineItem
}