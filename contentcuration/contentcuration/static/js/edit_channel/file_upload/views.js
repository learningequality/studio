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

var NAMESPACE = "fileUpload";
var MESSAGES = {
    "new": "New",
    "files": "Files",
    "title": "Title",
    "dont_save": "Don't Save",
    "keep_open": "Keep Open",
    "upload_files": "Upload Files",
    "edit_metadata": "Edit Metadata",
    "add_files": "Add files to continue",
    "no_preview": "No Preview Available",
    "total_size": "Total Size: ",
    "select_language": "Select language",
    "uploading_only": "View uploading only",
    "add_files_action": "ADD FILES",
    "drag_text": "(or drag and drop files below)",
    "upload_count": "{data, plural,\n =1 {# file}\n other {# files}} uploaded",
    "replace_file": "Replace File",
    "delete_file": "Delete File",
    "default_filename": "File",
    "preset_plural": "{preset}s",
    "download_file": "Download File",
    "upload_in_progress": "Upload in progress...",
    "drop_files_text": "Drop files here to add them to your channel",
    "file_not_supported": "This file type is not supported.",
    "max_size_exceeded": "Max file size exceeded.",
    "processing_error": "Error processing request.",
    "upload_error": "Error Uploading File",
    "not_available": "Not Available",
    "cancel_upload": "Cancel upload",
    "cancel_confirm": "Are you sure you want to cancel this upload?",
    "remove_file": "Remove file",
    "no_space": "Not enough space. Check your storage under Settings page.",
    "out_of_storage": "Out of Storage!"
};


var FileModalView = BaseViews.BaseModalView.extend({
    template: require("./hbtemplates/file_upload_modal.handlebars"),
    name: NAMESPACE,
    $trs: MESSAGES,
    initialize: function(options) {
        _.bindAll(this, "close_file_uploader");
        this.render(this.close_file_uploader, {});
        this.file_upload_view = new FileUploadView({
            container: this,
            model:this.model,
            onsave: options.onsave,
            onnew: options.onnew,
            isclipboard: options.isclipboard
        });
        this.$(".modal-body").append(this.file_upload_view.el);
        this.$(".modal").on('shown.bs.modal', this.file_upload_view.set_initial_focus);
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
        if(this.file_upload_view.collection.length === 0 && this.file_upload_view.current_view.uploads_in_progress > 0){
            this.close();
        }else{
            dialog.dialog(this.get_translation("unsaved_changes"), this.get_translation("unsaved_changes_text"), {
                [this.get_translation("dont_save")]: function(){
                    self.file_upload_view.reset();
                    self.close();
                    $(".modal-backdrop").remove();
                },
                [this.get_translation("keep_open")]:function(){},
            }, null);
            self.cancel_actions(event);
        }
    }
});

var FileUploadView = BaseViews.BaseView.extend({
    'id': "file_upload_view_el",
    template: require("./hbtemplates/file_upload.handlebars"),
    navigation_template: require("./hbtemplates/file_upload_buttons.handlebars"),
    name: NAMESPACE,
    $trs: MESSAGES,
    initialize: function(options) {
        _.bindAll(this,"go_to_upload", "go_to_metadata", "close_file_uploader", "set_initial_focus", "set_indices", 'loop_focus');
        this.container = options.container;
        this.collection = new Models.ContentNodeCollection();
        this.onsave = options.onsave;
        this.onnew = options.onnew;
        this.isclipboard = options.isclipboard;
        this.switch_view(1);
    },
    events:{
      "click .go_to_metadata": "go_to_metadata",
      'focus .input-tab-control': 'loop_focus'
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
        this.$el.html(this.template(null, {
            data: this.get_intl_data()
        }));
        this.$("#file_upload_buttons").html(this.navigation_template({
            uploading: stepNumber === 1
        }, {
            data: this.get_intl_data()
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
            allow_edit: true,
            isclipboard: this.isclipboard
        }
        switch(stepNumber){
            case 1:
                $("#metadata_step_number").removeClass("active_number");
                this.current_view = new FileUploadList(data);
                this.enable_next();
                break;
            case 2:
                var UploaderViews = require("edit_channel/uploader/views");
                $("#metadata_step_number").addClass("active_number");
                this.current_view = new UploaderViews.EditMetadataView(data);
                break;
        }
    },
    set_initial_focus: function(){
        this.current_view.set_initial_focus();
    },
    close_file_uploader:function(){
        this.container.close();
        $(".modal-backdrop").remove();
    },
    disable_next:function(upload_in_progress){
        $(".go_to_metadata").attr("disabled", "disabled");
        $(".go_to_metadata").addClass("disabled");
        this.$(".go_to_metadata").text((upload_in_progress)? this.get_translation("upload_in_progress") : this.get_translation("add_files"));
    },
    enable_next:function(){
        $(".go_to_metadata").removeAttr("disabled");
        $(".go_to_metadata").removeClass("disabled");
        this.$(".go_to_metadata").text(this.get_translation("edit_metadata").toUpperCase());
        setTimeout(function(){
            $(".go_to_metadata").focus();
        }, 100);
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
    name: NAMESPACE,
    $trs: MESSAGES,

    initialize: function(options) {
        _.bindAll(this, "file_uploaded",  "all_files_uploaded", "file_added", "file_removed","file_failed", "create_dropzone", "set_initial_focus");
        this.container = options.container;
        this.collection = options.collection;
        this.acceptedFiles = this.get_accepted_files();
        this.onsave = options.onsave;
        this.onnew = options.onnew;
        this.uploads_in_progress = 0;
        this.render();
        _.defer(this.set_initial_focus);
        (this.views.length)? this.enable_next() : this.disable_next(this.uploads_in_progress);
    },
    set_initial_focus: function(){
        this.container.set_indices();
        this.$(".fileinput-button").focus();
    },
    events:{
      "click #show_uploading" : "show_uploading",
    },
    render: function() {
        this.$el.html(this.template(null, {
            data: this.get_intl_data()
        }));
        this.load_content(this.collection, this.get_translation("drop_files_text"));
        this.update_count();
        _.defer(this.create_dropzone, 1);
    },
    show_uploading:function(event){
        var is_checked = this.$("#show_uploading").is(":checked");
        (is_checked)? this.$el.addClass('hide_uploaded') : this.$el.removeClass('hide_uploaded');
        this.$(this.default_item).css("display", (this.$(".format_item").length || this.uploads_in_progress || is_checked) ? "none" : "block");
        this.$("#file_upload_count").css("display", (is_checked) ? "flex" : "none");
    },
    disable_next:function(upload_in_progress){
        this.container.disable_next(upload_in_progress);
    },
    enable_next:function(){
        this.container.enable_next();
    },
    set_uploading:function(uploading){
        (uploading) ? this.uploads_in_progress++ : this.uploads_in_progress--;
        (this.uploads_in_progress <= 0)? this.container.enable_next() : this.container.disable_next(this.uploads_in_progress);
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
        if(this.$("#dropzone").get(0)){
            Dropzone.autoDiscover = false;
            this.dropzone = new Dropzone(this.$("#dropzone").get(0), {
                clickable: ["#dropzone", ".fileinput-button"],
                acceptedFiles: this.acceptedFiles,
                url: window.Urls.file_create(),
                previewTemplate:this.file_upload_template(null, { data: this.get_intl_data() }),
                parallelUploads: 1, //Math.max(1, browserHelper.get_max_parallel_uploads()),
                previewsContainer: this.list_selector, // Define the container to display the previews
                headers: {
                    "X-CSRFToken": get_cookie("csrftoken"),
                    "Preferences": JSON.stringify(window.current_channel.get('content_defaults'))
                },
                dictInvalidFileType: this.get_translation("file_not_supported"),
                dictFileTooBig: this.get_translation("max_size_exceeded"),
                dictResponseError: this.get_translation("processing_error"),
                dictCancelUpload: this.get_translation("cancel_upload"),
                dictCancelUploadConfirmation: this.get_translation("cancel_confirm"),
                dictRemoveFile: this.get_translation("remove_file")
            });

            this.dropzone.on("success", this.file_uploaded);
            this.dropzone.on("queuecomplete", this.all_files_uploaded);
            this.dropzone.on("addedfile", this.file_added);
            this.dropzone.on("removedfile", this.file_removed);
            this.dropzone.on("error", this.file_failed);
        }
    },
    create_new_view:function(model){
        model.set("tree_id", this.model.get("tree_id"));
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
    file_failed:function(file, error, xhr){
        if(xhr && xhr.status === 403){ // Catch errors thrown by server
            this.$(".error").html(this.get_translation("no_space"));
        }
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
        if (this.views.length === 0 && this.uploads_in_progress===0) {
            this.load_content(this.collection, this.get_translation("drop_files_text"));
        }
    },
    handle_completed:function(){
        if(this.check_completed() && this.uploads_in_progress === 0){
            this.enable_next();
        }
    },
    update_count:function(){
        $("#file_upload_count").text(this.get_translation("upload_count", this.views.length));
        this.show_uploading();
    }
});

var FormatEditorItem = BaseViews.BaseListNodeItemView.extend({
    allow_edit: true,
    tagName:'div',
    className: "format_item_wrapper files",
    files: null,
    presets:null,
    expandedIcon: "arrow_drop_down",
    collapsedIcon: "arrow_drop_up",
    thumbnail_template: require("./hbtemplates/file_upload_thumbnail.handlebars"),
    name: NAMESPACE,
    $trs: MESSAGES,

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
            if(!file.preset.display){
                return dict;
            }

            // Don't count duplicate files to total file size
            var file_size = dict.size;
            if (!_.contains(dict.checksums, file.checksum)) {
                file_size += file.file_size;
            }

            return {
                    'count': dict.count + 1,
                    'size': file_size,
                    'main_file_count': dict.main_file_count + !file.preset.supplementary,
                    'checksums': dict.checksums.concat(file.checksum)
                };
        }, {'count': 0, 'size': 0, 'main_file_count': 0, 'checksums': []});
    },
    set_uploading:function(uploading){
        this.containing_list_view.set_uploading(uploading);
    },
    remove_item:function(){
        this.files.forEach(function(file){ if(file) file.destroy(); });
        this.containing_list_view.remove_view(this);
        this.remove();
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
              default_url: "/static/img/" + this.model.get("kind") + "_placeholder.png",
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
        this.set_thumbnail(null, null);
    },
    set_thumbnail:function(thumbnail, encoding){
        var files = _.reject(this.model.get('files'), function(f){ return f.preset.thumbnail; });
        if(thumbnail){
            thumbnail.set('contentnode', this.model.id);
            files = files.concat(thumbnail.toJSON());
        }
        this.model.set('files', files);
        this.model.set('thumbnail_encoding', encoding);
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
        }, {
            data: this.get_intl_data()
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
        _.defer(this.containing_list_view.container.set_indices)
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
        }, {
            data: this.get_intl_data()
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
    language_view: null,
    template: require("./hbtemplates/file_upload_format_slot_list.handlebars"),
    list_selector:">.preset_list",
    default_item:">.preset_list .default-slot-item",
    name: NAMESPACE,
    $trs: MESSAGES,
    initialize: function(options) {
        this.content_node_view = options.content_node_view;
        this.node = this.model;
        this.collection = options.collection;
        this.allow_edit = options.allow_edit;
        this.files = options.files;
        this.collection = options.collection;
        this.render();
    },
    render: function() {
        this.$el.html(this.template(null, {
            data: this.get_intl_data()
        }));
        this.load_content();
    },
    update_metadata: function(model){
        this.content_node_view.update_metadata();
    },
    create_new_view: function(model){
        var associated_file = this.files.find(function(file){
            return file.get("preset").id  === model.get("id");
        });
        var format_slot = new FormatSlot({
            model: model,
            node : this.model,
            file: associated_file,
            containing_list_view: this,
            files: this.files,
            collection: this.collection,
            content_node_view: this.content_node_view,
            language_view: this.language_view,
            allow_edit: this.allow_edit
        });
        this.views.push(format_slot);
        return format_slot;
    },
    set_file_format:function(file, preset, originalFile){
        if(originalFile){
            this.files.remove(originalFile);
            this.collection.remove(preset)
            this.node.set('files', _.reject(this.node.get('files'), function(f){ return f.id === originalFile.id; }));
        }
        if(file){
            file.set({ "preset": preset.toJSON(), "contentnode": this.model.get("id") });
            this.collection.add(preset)
            this.files.push(file);
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
    collapsedIcon: "expand_less",
    expandedIcon: "expand_more",
    name: NAMESPACE,
    $trs: MESSAGES,

    getToggler: function () { return this.$("#format_item_" + this.model.id); },
    getSubdirectory: function () {return this.$("#format_item_" + this.model.id +"_sub"); },

    'id': function() { return "format_slot_item_" + this.model.get("id"); },
    selector: function() { return this.cid + "_"+ this.model.get("id") + "_"  + this.node.get('id') + "_dropzone" + ((this.file)? "_swap" : "") },
    className:"row format_editor_item",
    initialize: function(options) {
        _.bindAll(this, 'remove_item','file_uploaded','file_added','file_removed','file_failed', 'create_dropzone', 'set_file', 'set_uploading');
        this.containing_list_view = options.containing_list_view;
        this.content_node_view = options.content_node_view;
        this.language_view = options.language_view;
        this.file = options.file;
        this.originalFile = this.file;
        this.files = options.files;
        this.collection = options.collection;
        this.allow_edit = options.allow_edit;
        this.node = options.node;
        this.render();
    },
    events: {
        'click .format_editor_remove ' : 'remove_item',
         "click .multilanguage_folder" : "toggle"
    },
    render: function() {
        this.$el.html(this.template({
            file: (this.file)? this.file.toJSON() : null,
            preset: this.model.toJSON(),
            selector: this.selector(),
            multi_language: this.model.get('multi_language') && !this.file,
            is_language: this.containing_list_view.is_language,
            allow_edit: this.allow_edit,
            src: (this.file)? this.file.get('storage_url') : null
        }, {
            data: this.get_intl_data()
        }));
        if(this.allow_edit && (!this.model.get('multi_language') || this.file)){
            _.defer(this.create_dropzone);
        }
    },
    create_dropzone:function(){
        var dz_selector="#" + this.selector();
        var clickables = [dz_selector + " .dz-clickable"];
        if(this.file){
            clickables.push(dz_selector + " .format_editor_file_name");
        }
        Dropzone.autoDiscover = false;
        if($(dz_selector).length && !$(dz_selector).hasClass("dropzone_attached")){
            var dropzone = new Dropzone($(dz_selector).get(0), {
               clickable: clickables,
               acceptedFiles: this.get_accepted_files(),
               url: window.Urls.file_upload(),
               previewTemplate:this.dropzone_template(null, { data: this.get_intl_data() }),
               maxFiles: 1,
               previewsContainer: dz_selector,
               headers: {
                    "X-CSRFToken": get_cookie("csrftoken"),
                    "Node" : this.node.get('id'),
                    "Preset": this.model.get("name") || this.model.id,
                    "Language": (this.file && this.file.get("language"))? this.file.get("language").id : null
                },
                dictInvalidFileType: this.get_translation("file_not_supported"),
                dictFileTooBig: this.get_translation("max_size_exceeded"),
                dictResponseError: this.get_translation("processing_error"),
                dictCancelUpload: this.get_translation("cancel_upload"),
                dictCancelUploadConfirmation: this.get_translation("cancel_confirm"),
                dictRemoveFile: this.get_translation("remove_file"),
            });
            dropzone.on("success", this.file_uploaded);

            // Only enable the submit upload files button once all files have finished uploading.
            dropzone.on("addedfile", this.file_added);
            dropzone.on("removedfile", this.file_removed);
            dropzone.on("error", this.file_failed);
            $(dz_selector).addClass("dropzone_attached");
        }
    },
    get_accepted_files:function(){
        var preset_name = this.model.get('name') || this.model.id
        var preset = window.formatpresets.findWhere({id: preset_name});
        return preset.get("associated_mimetypes").join(",");
    },
    file_uploaded:function(file){
        var data = JSON.parse(file.xhr.response).file;
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
    file_failed:function(file, error, xhr){
        var self = this;
        var title = this.get_translation("upload_error");
        var message = error;
        if(xhr && xhr.status === 403){ // Catch errors thrown by server
            title = this.get_translation("out_of_storage");
            message = this.get_translation("no_space");
        }
        dialog.alert(title, message, function(){
            self.render();
            self.set_uploading(false);
            self.containing_list_view.update_metadata();
        });
    },
    remove_item:function(){
        if(this.language_view){
            this.language_view.add_language(new Models.LanguageModel(this.file.get('language')));
            this.set_file(null);
            this.remove();
            this.containing_list_view.render();
        }else{
            this.set_file(null);
            this.render();
        }
    },
    set_uploading:function(uploading){
        this.containing_list_view.set_uploading(uploading);
    },
    load_subfiles:function(){
        var data = {
            node : this.node,
            model: this.model,
            el: $(this.getSubdirectory()),
            container: this.container,
            files: this.files,
            collection: this.collection,
            containing_view: this,
            content_node_view: this.content_node_view,
            allow_edit: this.allow_edit
        }
        this.subcontent_view = new MultiLanguageSlotList(data);
    },
});

var MultiLanguageSlotList = FormatSlotList.extend({
    template: require("./hbtemplates/file_upload_multilanguage_slot_list.handlebars"),
    list_selector:">.multilanguage_list .preset_list",
    default_item:">.multilanguage_list .preset_list .default-slot-item",
    is_language: true,

    initialize: function(options) {
        this.container = options.containing_view;
        this.preset_collection = options.collection;
        this.content_node_view = options.content_node_view;
        this.node = options.node;
        this.allow_edit = options.allow_edit;
        var preset_id = this.model.id;
        this.files = new Models.FileCollection(options.files.filter(function(f) { return f.get('preset').name === preset_id; }));
        this.collection = new Models.FormatPresetCollection(this.files.pluck('preset'));
        this.render();
    },
    render: function() {
        this.$el.html(this.template(null, {
            data: this.get_intl_data()
        }));
        if(this.allow_edit){
            this.language_view = new MultiLanguageUploadSlot({
                el: this.$(".add_multilanguage_item_wrapper"),
                model: this.model,
                node: this.node,
                files: this.files,
                collection: this.collection,
                containing_list_view: this,
            });
        }
        this.load_content();
    },
    add_slot:function(file, preset, target){
        this.files.push(file);
        this.collection.add(preset);
        var node_files = this.node.get('files')
        var new_files = new Models.FileCollection(this.files.reject(function(f){return _.contains(node_files, f);})).toJSON();
        this.node.set('files', node_files.concat(new_files));
        this.set_file_format(file, preset);
        this.render();
    }
});


var MultiLanguageUploadSlot = FormatSlot.extend({
    template: require("./hbtemplates/format_multilanguage_item.handlebars"),
    language_template: require("./hbtemplates/format_multilanguage_dropdown.handlebars"),
    className:"row format_editor_item",
    'id': function() { return "format_slot_item_" + this.model.get("id"); },
    selector: function() { return this.model.get("id") + "_"  + this.node.get('id') + "_dropzone"; },
    initialize: function(options) {
        _.bindAll(this, 'remove_item','file_uploaded','file_added','file_removed','file_failed', 'create_dropzone');
        this.containing_list_view = options.containing_list_view;
        this.node = options.node;
        this.files = options.files;
        this.languages = this.get_unassigned_languages();
        this.render();
    },
    get_unassigned_languages: function(){
        var current_languages = _.pluck(_.filter(this.files.pluck('language'), function(l){ return l; }), "id");
        return new Models.LanguageCollection(window.languages.reject(function(l){ return _.contains(current_languages, l.id); }));
    },
    events: {
        'click .format_editor_remove ' : 'remove_item',
        'change .language_dropdown' : 'check_and_set_language'
    },
    render: function() {
        this.$el.html(this.template({
            file: (this.file)? this.file.toJSON() : null,
            preset: this.model.toJSON(),
            selector: this.selector(),
            preset_name : (this.file && this.file.get("display_name"))? this.file.get("display_name") : this.model.get("readable_name")
        }, {
            data: this.get_intl_data()
        }));
        _.defer(this.create_dropzone);
        this.load_languages();
    },
    load_languages: function(){
        this.$(".language_dropdown").html(this.language_template({languages: this.languages.toJSON()}, {
            data: this.get_intl_data()
        }));
        if(!this.file){ this.language = null; }
        if(this.language) this.$('.language_dropdown').val(this.language);
    },
    check_and_set_language:function(event){
        this.set_language();
    },
    add_language:function(language){
        this.languages.add(language);
        this.load_languages();
    },
    set_language:function(){
        this.language = this.$(".language_dropdown").val();
        if(this.language && this.file){
            var selected_lang = this.languages.findWhere({id:this.language});
            this.file.set_preset(this.model.toJSON(), selected_lang.toJSON());
            var new_preset = new Models.FormatPresetModel(this.file.get('preset'));
            this.file.set({
                "language": selected_lang.toJSON(),
                "display_name": new_preset.get('readable_name')
            });
            this.containing_list_view.add_slot(this.file, new_preset, this);
            this.file = null;
            this.languages.remove(this.language);
        }
    },
    set_file:function(file){
        this.file = file;
        this.set_language();
        if(!this.language){
            this.render();
        }
    }
});

module.exports = {
    FileUploadView:FileUploadView,
    FileModalView:FileModalView,
    FormatInlineItem:FormatInlineItem
}
