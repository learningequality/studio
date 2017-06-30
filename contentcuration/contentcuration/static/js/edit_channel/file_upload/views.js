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
            headers: {
                "X-CSRFToken": get_cookie("csrftoken"),
                "Preferences": JSON.stringify(window.current_channel.get('preferences'))
            },
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
            if(!file.preset.display || _.contains(dict.checksums, file.checksum)){
                return dict;
            }
            return {
                    'count': dict.count + 1,
                    'size': dict.size + file.file_size,
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
            this.thumbnail_view = new ThumbnailUploadView({
              model: this.model,
              preset_id: preset_id,
              upload_url: window.Urls.image_upload(),
              acceptedFiles: window.formatpresets.get({id:preset_id}).get('associated_mimetypes').join(','),
              onsuccess: this.set_thumbnail,
              onremove: this.remove_thumbnail,
              onerror: onerror,
              onfinish:onfinish,
              onstart: onstart,
              allow_edit: this.allow_edit
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
    language_view: null,
    template: require("./hbtemplates/file_upload_format_slot_list.handlebars"),
    list_selector:">.preset_list",
    default_item:">.preset_list .default-slot-item",
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
        this.$el.html(this.template());
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
    collapsedClass: "glyphicon-menu-up",
    expandedClass: "glyphicon-menu-down",

    getToggler: function () { return this.$("#format_item_" + this.model.id); },
    getSubdirectory: function () {return this.$("#format_item_" + this.model.id +"_sub"); },

    'id': function() { return "format_slot_item_" + this.model.get("id"); },
    selector: function() { return this.model.get("id") + "_"  + this.node.get('id') + "_dropzone" + ((this.file)? "_swap" : "") },
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
            allow_edit: this.allow_edit,
            src: (this.file)? this.file.get('storage_url') : null
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
        var dropzone = new Dropzone(dz_selector, {
           clickable: clickables,
           acceptedFiles: this.get_accepted_files(),
           url: window.Urls.file_upload(),
           previewTemplate:this.dropzone_template(),
           maxFiles: 1,
           previewsContainer: dz_selector,
           headers: {
                "X-CSRFToken": get_cookie("csrftoken"),
                "Node" : this.node.get('id'),
                "Preset": this.model.get("name") || this.model.id,
                "Language": (this.file && this.file.get("language"))? this.file.get("language").id : null
            }
        });
        dropzone.on("success", this.file_uploaded);

        // Only enable the submit upload files button once all files have finished uploading.
        dropzone.on("addedfile", this.file_added);
        dropzone.on("removedfile", this.file_removed);
        dropzone.on("error", this.file_failed);
    },
    get_accepted_files:function(){
        var preset_name = this.model.get('name') || this.model.id
        var preset = window.formatpresets.findWhere({id: preset_name});
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
        dialog.alert("Error Uploading File", error, function(){
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
        this.$el.html(this.template());
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
        }));
        _.defer(this.create_dropzone);
        this.load_languages();
    },
    load_languages: function(){
        this.$(".language_dropdown").html(this.language_template({languages: this.languages.toJSON()}));
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

var ThumbnailUploadView = BaseViews.BaseView.extend({
    template: require("./hbtemplates/thumbnail_upload.handlebars"),
    preview_template: require("./hbtemplates/thumbnail_preview.handlebars"),
    dropzone_template: require("./hbtemplates/thumbnail_dropzone.handlebars"),
    initialize: function(options) {
        _.bindAll(this, 'image_uploaded','image_added','image_removed','create_dropzone', 'image_completed','image_failed', 'use_image');
        this.image_url = options.image_url;
        this.onsuccess = options.onsuccess;
        this.onremove = options.onremove;
        this.onerror = options.onerror;
        this.onfinish = options.onfinish;
        this.onstart = options.onstart;
        this.preset_id = options.preset_id;
        this.acceptedFiles = options.acceptedFiles;
        this.upload_url = options.upload_url;
        this.default_url = options.default_url;
        this.allow_edit = options.allow_edit;
        this.render();
        this.dropzone = null;
        this.image_success = true;
    },
    events: {
        'click .remove_image ' : 'remove_image',
        'click .open_thumbnail_generator': 'open_thumbnail_generator'
    },
    render: function() {
        if(this.allow_edit){
            this.$el.html(this.template({
                picture : this.get_thumbnail_url(),
                selector: this.get_selector(),
                show_generate: this.model.get('kind') != undefined
            }));
            _.defer(this.create_dropzone, 1);
        }else{
            this.$el.html(this.preview_template({
                picture : this.get_thumbnail_url(),
                name: this.model.get('title')
            }));
        }
    },
    get_thumbnail_url:function(){
        var thumbnail = _.find(this.model.get('files'), function(f){ return f.preset.thumbnail; });
        if(this.image_url){ return this.image_url; }
        else if(thumbnail){ return thumbnail.storage_url; }
        else if(this.model.get('kind') != undefined) { return "/static/img/" + this.model.get("kind") + "_placeholder.png"; }
        else{ return "/static/img/kolibri_placeholder.png"; }
    },
    remove_image: function(){
        var self = this;
        dialog.dialog("Removing Image", "Are you sure you want to remove this image?", {
            "CANCEL":function(){},
            "REMOVE": function(){
                self.image = null;
                self.image_url = self.default_url;
                self.onremove();
                self.render();
            },
        }, function(){});
    },
    get_selector: function(){
        return "dropzone_" + this.cid;
    },
    create_dropzone:function(){
        var selector = "#" + this.get_selector();
        this.dropzone = new Dropzone(this.$(selector).get(0), {
            maxFiles: 1,
            clickable: [selector + "_placeholder", selector + "_swap"],
            acceptedFiles: this.acceptedFiles,
            url: this.upload_url,
            previewTemplate:this.dropzone_template({src:"/static/img/loading_placeholder.png"}),
            previewsContainer: selector,
            headers: {"X-CSRFToken": get_cookie("csrftoken"), "Preset": this.preset_id, "Node": this.model.id}
        });
        this.dropzone.on("success", this.image_uploaded);
        this.dropzone.on("addedfile", this.image_added);
        this.dropzone.on("removedfile", this.image_removed);
        this.dropzone.on("queuecomplete", this.image_completed);
        this.dropzone.on("error", this.image_failed);
    },
    image_uploaded:function(image){
        this.image_error = null;
        result = JSON.parse(image.xhr.response)
        if(result.file){
            this.image = new Models.FileModel(JSON.parse(result.file));
        }
        this.image_url = result.path;
        this.image_formatted_name = result.formatted_filename;
    },
    image_completed:function(){
        if(this.image_error){
            dialog.alert("Image Error", this.image_error);
            if(this.onerror){ this.onerror(); }
        }else{
            if(this.onsuccess){ this.onsuccess(this.image, this.image_formatted_name, this.image_url); }
            if(this.onfinish){ this.onfinish(); }
        }
        this.render();
    },
    image_failed:function(data, error){
        this.image_error = error;
    },
    image_added:function(thumbnail){
        this.image_error = "Error uploading file: connection interrupted";
        this.$(".finished_area").css('display', 'none');
        this.$("#" + this.get_selector() + "_placeholder").css("display", "none");
        if(this.onstart){ this.onstart(); }
    },
    image_removed:function(thumbnail){
        this.image_error = null;
        this.$("#" + this.get_selector() + "_placeholder").css("display", "block");
        this.$(".finished_area").css('display', 'block');
        if(this.onfinish){ this.onfinish(); }
    },
    use_image:function(file){
        this.image = file;
        this.image_url = file.get('storage_url');
        this.onsuccess(this.image, this.image_formatted_name, this.image_url);
        this.render();
        if(this.onfinish){ this.onfinish(); }
    },
    open_thumbnail_generator:function(){
        var thumbnail_modal = new ThumbnailModalView({
            node: this.model,
            onuse: this.use_image,
            model: this.image
        });
    }
});

var ThumbnailModalView = BaseViews.BaseModalView.extend({
    template: require("./hbtemplates/thumbnail_generator_modal.handlebars"),
    img_template: require("./hbtemplates/thumbnail_generator_preview.handlebars"),
    initialize: function(options) {
        _.bindAll(this, "generate_thumbnail", 'use_thumbnail', 'render_preview');
        this.modal = true;
        this.node = options.node;
        this.onuse = options.onuse;
        this.render();

    },
    events: {
        'click #generate_thumbnail' : 'generate_thumbnail',
        'click #use_thumbnail' : 'use_thumbnail'
    },
    render: function() {
        this.$el.html(this.template());
        $("body").append(this.el);
        this.$("#thumbnail_modal").modal({show: true});
        this.$("#thumbnail_modal").on("hide.bs.modal", this.close);
        this.render_preview()
        this.$(".modal").on("hide.bs.modal", this.close);
        this.$(".modal").on("hidden.bs.modal", this.closed_modal);
    },
    render_preview:function(){
        this.$("#thumbnail_preview").html(this.img_template({
          model: this.model? this.model.toJSON() : null
        }));
        this.handle_file();
    },
    generate_thumbnail:function(){
        var self = this;
        this.$("#thumbnail_area").removeClass('error').addClass('loading');
        this.$("#generate_thumbnail").attr("disabled", "disabled");
        this.node.generate_thumbnail().then(function(result){
            self.$("#thumbnail_area").removeClass('loading');
            self.model = result;
            self.render_preview();
            self.enable_generate();
        }).catch(function(error){
            self.$("#thumbnail_area").removeClass('loading').addClass('error');
            self.$("#generate_thumbnail_error").text(error.responseText);
            self.enable_generate();
        });
    },
    enable_generate:function(){
        $("#generate_thumbnail").removeAttr("disabled");
        $("#generate_thumbnail").removeClass("disabled");
    },
    use_thumbnail:function(){
        this.onuse(this.model);
        this.close();
    },
    handle_file:function(){
        if(this.model){
           this.$("#use_thumbnail").removeAttr("disabled");
           this.$("#use_thumbnail").removeClass("disabled");
        } else{
            this.$("#use_thumbnail").attr("disabled", "disabled");
           this.$("#use_thumbnail").addClass("disabled");
        }
    }
});

var ImageUploadView = BaseViews.BaseModalView.extend({
    modal: true,

    initialize: function(options) {
        _.bindAll(this, "file_uploaded", "file_added", "file_removed", "file_failed", "submit_file", "file_complete", "set_alt_text");
        this.callback = options.callback;
        this.file = this.alt_text = null;
        this.preset_id = options.preset_id;
        this.render();
    },

    template: require("./hbtemplates/image_upload.handlebars"),
    dropzone_template : require("./hbtemplates/image_upload_dropzone.handlebars"),
    modal_template: require("./hbtemplates/image_upload_modal.handlebars"),

    events: {
        "click #submit_file": "submit_file",
        "change #alt_text_box": "set_alt_text"
    },

    render: function() {
        this.$el.html(this.modal_template());
        $("body").append(this.el);
        this.$(".modal").modal({show: true});
        this.$(".modal").on("hide.bs.modal", this.close);
        this.$(".modal").on("hidden.bs.modal", this.closed_modal);
        this.render_dropzone();
    },
    render_dropzone:function(){
        this.$(".modal-body").html(this.template({file: this.file, alt_text: this.alt_text}));
        this.dropzone = new Dropzone(this.$("#dropzone").get(0), {
            maxFiles: 1,
            clickable: ["#dropzone", "#dropzone_placeholder"],
            acceptedFiles: window.formatpresets.get({id:this.preset_id}).get('associated_mimetypes').join(','),
            url: window.Urls.exercise_image_upload(),
            thumbnailWidth:null,
            thumbnailHeight:null,
            previewTemplate:this.dropzone_template(),
            previewsContainer: "#dropzone",
            headers: {"X-CSRFToken": get_cookie("csrftoken")}
        });
        this.dropzone.on("success", this.file_uploaded);
        this.dropzone.on("addedfile", this.file_added);
        this.dropzone.on("removedfile", this.file_removed);
        this.dropzone.on("error", this.file_failed);
        this.dropzone.on("queuecomplete", this.file_complete);
    },
    set_alt_text: function(event){
        this.alt_text = event.target.value;
    },
    submit_file:function(){
        this.callback(this.file.file_id, this.file.formatted_filename, this.alt_text);
        this.close();
    },
    file_uploaded: function(file) {
        this.file_error = null;
        this.file = JSON.parse(file.xhr.response);
    },
    file_added:function(file){
        this.file_error = "Error uploading file: connection interrupted";
        this.$("#dropzone_placeholder").css("display", "none");
    },
    file_removed:function(){
        this.file_error = null;
        this.file = null;
        this.render_dropzone();
    },
    file_failed:function(data, error){
        this.file_error = error;
    },
    file_complete:function(){
        if(this.file_error){
            dialog.alert("Image Error", this.file_error);
        }
        this.render_dropzone();
    }
});

module.exports = {
    FileUploadView:FileUploadView,
    FileModalView:FileModalView,
    FormatInlineItem:FormatInlineItem,
    ThumbnailUploadView: ThumbnailUploadView,
    ImageUploadView:ImageUploadView
}
