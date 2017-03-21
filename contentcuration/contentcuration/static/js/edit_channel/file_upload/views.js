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

var FileModalView = BaseViews.BaseModalView.extend({
    template: require("./hbtemplates/file_upload_modal.handlebars"),
    initialize: function(options) {
        _.bindAll(this, "close_file_uploader");
        this.render(this.close_file_uploader, {});
        this.file_upload_view = new FileUploadView({
            el: this.$(".modal-body"),
            container: this,
            model:this.model,
            onsave: options.onsave,
            onnew: options.onnew
        });
    },
    close_file_uploader:function(event){
        if(this.file_upload_view.collection.length === 0){
            this.close();
        }else if(confirm("Unsaved Metadata Detected! Exiting now will"
            + " undo any new changes. \n\nAre you sure you want to exit?")){
            this.file_upload_view.reset();
            this.close();
        }else{
            this.cancel_actions(event);
        }
    }
});

var FileUploadView = BaseViews.BaseView.extend({
    template: require("./hbtemplates/file_upload.handlebars"),
    navigation_template: require("./hbtemplates/file_upload_buttons.handlebars"),
    initialize: function(options) {
        _.bindAll(this,"go_to_formats", "go_to_upload", "go_to_metadata", "close_file_uploader");
        this.container = options.container;
        this.collection = new Models.ContentNodeCollection();
        this.onsave = options.onsave;
        this.onnew = options.onnew;
        this.render();
    },
    events:{
      "click .go_to_formats" : "go_to_formats",
      "click .go_to_upload" : "go_to_upload",
      "click .go_to_metadata": "go_to_metadata",
      "click .go_to_upload_from_metadata":"go_to_upload"
    },
    render: function() {
        this.switch_view(1);
    },
    go_to_formats:function(){
        this.switch_view(2);
    },
    go_to_upload:function(){
        this.switch_view(1);
    },
    go_to_metadata:function(){
        this.switch_view(3);
    },
    switch_view:function(stepNumber){
        if(this.current_view){
            this.current_view.remove();
        }
        this.$el.html(this.template());
        this.$("#file_upload_buttons").html(this.navigation_template({
            uploading: stepNumber === 1,
            formatting: stepNumber === 2
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
            collection: this.collection
        }

        switch(stepNumber){
            case 1:
                $("#formats_step_number").removeClass("active_number");
                $("#metadata_step_number").removeClass("active_number");
                this.current_view = new FileUploadList(data);
                this.current_view.check_completed() ? this.enable_next() : this.disable_next();
                break;
            case 2:
                $("#formats_step_number").addClass("active_number");
                this.current_view = new FileFormatList(data);
                this.current_view.check_completed() ? this.enable_submit() : this.disable_submit();
                break;
            case 3:
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
        this.$(".go_to_formats").attr("disabled", "disabled");
        this.$(".go_to_formats").addClass("disabled");
        this.$(".go_to_formats").text((upload_in_progress)? "Upload in progress..." : "Add files to continue");
    },
    enable_next:function(){
        this.$(".go_to_formats").removeAttr("disabled");
        this.$(".go_to_formats").removeClass("disabled");
        this.$(".go_to_formats").text("NEXT");
    },
    disable_submit: function() {
        this.$(".go_to_metadata").attr("disabled", "disabled");
        this.$(".go_to_metadata").addClass("disabled");
        this.$(".go_to_metadata").text((this.current_view.check_completed()) ? "Upload in progress..." : "Assign formats to continue");
    },
    enable_submit: function() {
        this.$(".go_to_metadata").removeAttr("disabled");
        this.$(".go_to_metadata").removeClass("disabled");
        this.$(".go_to_metadata").text("EDIT METADATA");
    },
    reset:function(){
        if(this.current_view){
            this.current_view.reset();
        }
    }
});

var FileBaseList = BaseViews.BaseEditableListView.extend({
    list_selector:"#file_upload_list",
    default_item:"#file_upload_list >.default-item",
    disable_next:function(upload_in_progress){
        this.container.disable_next(upload_in_progress);
    },
    enable_next:function(){
        this.container.enable_next();
    },
    disable_submit: function() {
        this.container.disable_submit();
    },
    enable_submit: function() {
        this.container.enable_submit();
    },
    remove_view: function(view){
        this.views.splice(this.views.indexOf(this), 1);
        this.collection.remove(view.model);
        view.remove();
        this.handle_if_empty();
        if(this.views.length ===0){
            this.container.switch_view(1);
        }else{
            this.handle_completed();
        }
    },
    check_completed:function(){
        var is_completed = this.views.length > 0;
        this.views.forEach(function(view){
            is_completed = is_completed && view.check_for_completion();
        });
        return is_completed;
    }
});

var FileUploadList = FileBaseList.extend({
    template: require("./hbtemplates/file_upload_upload_list.handlebars"),
    file_upload_template: require("./hbtemplates/file_upload_dropzone_item.handlebars"),

    initialize: function(options) {
        _.bindAll(this, "file_uploaded",  "all_files_uploaded", "file_added", "file_removed","file_failed");
        this.container = options.container;
        this.collection = options.collection;
        this.acceptedFiles = this.get_accepted_files();
        this.onsave = options.onsave;
        this.onnew = options.onnew;
        this.uploads_in_progress = 0;
        this.render();
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
    render: function() {
        this.$el.html(this.template());
        // TODO parameterize to allow different file uploads depending on initialization.
        this.dropzone = new Dropzone(this.$("#dropzone").get(0), {
            clickable: ["#dropzone", ".fileinput-button"],
            acceptedFiles: this.acceptedFiles,
            url: window.Urls.file_create(),
            previewTemplate:this.file_upload_template(),
            parallelUploads: Math.max(1, browserHelper.get_max_parallel_uploads()),
            //autoQueue: false, // Make sure the files aren't queued until manually added
            previewsContainer: this.list_selector, // Define the container to display the previews
            headers: {"X-CSRFToken": get_cookie("csrftoken")},
            dictInvalidFileType: "This file type is not supported.",
            dictFileTooBig: "Max file size exceeded.",
            dictResponseError: "Error processing request."
        });
        this.load_content(this.collection, "Drop files here to add them to your channel");

        this.dropzone.on("success", this.file_uploaded);

        // Only enable the submit upload files button once all files have finished uploading.
        this.dropzone.on("queuecomplete", this.all_files_uploaded);

        // Disable the submit upload files button if a new file is added to the queue.
        this.dropzone.on("addedfile", this.file_added);

        this.dropzone.on("removedfile", this.file_removed);
        this.dropzone.on("error", this.file_failed);
    },
    create_new_view:function(model){
        var new_format_item = new FormatUploadItem({
            model: model,
            containing_list_view : this
        });
        this.views.push(new_format_item);
        return new_format_item;
    },
    file_uploaded: function(request) {
        var data = JSON.parse(request.xhr.response)
        var new_node = new Models.ContentNodeModel({id: data.object_id});
        var self = this;
        this.fetch_model(new_node).then(function(fetched){
            self.collection.add(fetched);
            var new_view = self.create_new_view(fetched);
            if(data.preset){
                new_view.set_preset(data.preset);
            }
            $(request.previewTemplate).html(new_view.el);
            if(self.uploads_in_progress<=0){
                self.enable_next();
            }
        });
    },
    file_failed:function(file, error){
        this.uploads_in_progress --;
        $(file.previewTemplate).find(".dropzone_remove").css("display", "inline-block");
    },
    all_files_uploaded: function() {
        this.uploads_in_progress = 0;
    },
    file_added: function(file) {
        this.uploads_in_progress ++;
        this.$(this.default_item).css("display", "none");
        this.disable_next(this.uploads_in_progress > 0);
    },
    file_removed: function(file) {
        if (this.views.length === 0) {
            this.disable_next(this.uploads_in_progress > 0);
            this.load_content(this.collection, "Drop files here to add them to your channel");
        }
    },
    handle_completed:function(){
        if(this.check_completed() && this.uploads_in_progress === 0){
            this.enable_next();
        }
    }
});

var FileFormatList  = FileBaseList.extend({
    template: require("./hbtemplates/file_upload_format_list.handlebars"),
    selectedClass: "file-selected",

    initialize: function(options) {
        _.bindAll(this, "hide_assigned");
        this.container = options.container;
        this.collection = options.collection;
        this.uploads_in_progress = 0;
        this.render();
    },
    events:{
      "click #show_unassigned" : "hide_assigned"
    },
    render: function() {
        this.$el.html(this.template());
        this.load_content();
    },
    hide_assigned:function(){
        var to_hide = this.$el.find(".hide_assigned").parent("li");
        var is_checked = this.$("#show_unassigned").is(":checked");
        to_hide.css("display", (is_checked) ? "none" : "block");
        if(to_hide.length === this.views.length){
            this.$(this.default_item).text("All files have been assigned a format.");
            this.$(this.default_item).css("display", (is_checked) ? "block" : "none");
        }
    },
    create_new_view:function(model){
        var new_format_item = new FormatFormatItem({
            model: model,
            containing_list_view : this,
        });
        this.views.push(new_format_item);
        return new_format_item;
    },
    handle_completed:function(){
        if(this.check_completed()){
            this.enable_submit();
        }
    },
    set_uploading:function(uploading){
        (uploading)? this.uploads_in_progress++ : this.uploads_in_progress--;
        (this.uploads_in_progress===0)? this.container.enable_submit() : this.container.disable_submit();
    }
});

var FormatItem = BaseViews.BaseListNodeItemView.extend({
    thumbnail_template: require("./hbtemplates/file_upload_thumbnail.handlebars"),
    className: "format_item row table table-striped files file-row",
    files: null,
    presets:null,

    'id': function() {
        return "format_item_" + this.model.filename;
    },
    init_collections:function(){
        this.presets = new Models.FormatPresetCollection(_.reject(this.model.get("associated_presets"),{display:false}));
        this.files=new Models.FileCollection(this.model.get("files"));
    },
    remove_item:function(){
        this.files.forEach(function(file){
            file.destroy();
        });
        this.containing_list_view.remove_view(this);
        this.model.destroy();
    },
    set_file_format:function(file, preset){
        file.set({preset: preset.toJSON()});
        this.model.set("files", this.files.toJSON());
        this.containing_list_view.handle_completed();
    },
    get_thumbnail:function(){
        var self = this;
        var to_return = null;
        this.files.forEach(function(file){
            if (file.get("preset")){
                var preset_id = (file.get("preset").id) ? file.get("preset").id : file.get("preset");
                if(self.presets.get(preset_id).get("thumbnail")){
                    to_return = file;
                    return;
                }
            }
        });
        return to_return;
    },
    set_thumbnail:function(file){
        var placeholder = "/static/img/" + this.model.get("kind") + "_placeholder.png";
        this.$el.find(".preview_thumbnail").html(this.thumbnail_template({
            thumbnail:(file && file.attributes)? file.get('storage_url') : placeholder
        }));
    },
});

var FormatUploadItem = FormatItem.extend({
    template: require("./hbtemplates/file_upload_upload_item.handlebars"),
    inline_template: require("./hbtemplates/file_upload_inline_item.handlebars"),

    initialize: function(options) {
        _.bindAll(this, 'remove_item', 'set_thumbnail', 'get_thumbnail');
        this.containing_list_view = options.containing_list_view;
        this.originalData = this.model.toJSON();
        this.init_collections();
        this.set_presets();
        this.render();
    },
    events: {
        'click .remove_from_dz ' : 'remove_item',
    },
    render: function() {
        var total_file_size = 0;
        this.initial = this.files.findWhere({preset:null});
        this.files.forEach(function(file){
            total_file_size += file.get("file_size");
        })
        this.$el.html(this.template({
            initial: this.initial,
            node: this.model.toJSON(),
            files: this.files.toJSON(),
            total_file_size: total_file_size
        }));
        this.set_thumbnail(this.get_thumbnail());
    },
    auto_assign_preset:function(){
        var nonsupplementarypresets = this.presets.where({supplementary:false});
        var to_assign = this.files.findWhere({preset:null});
        if(nonsupplementarypresets.length === 1 && to_assign){
            this.set_file_format(to_assign, nonsupplementarypresets[0]);
        }
    },
    check_for_completion:function(){
       return true;
    },
    set_presets:function(){
        var self = this;
        this.files.forEach(function(file){
            self.set_file_format(file, self.presets.get(file.get("preset")));
        });
    }
});
var FormatEditorItem = FormatItem.extend({
    expandedClass: "glyphicon-triangle-bottom",
    collapsedClass: "glyphicon-triangle-top",

    getToggler: function () { return this.$(".expand_format_editor"); },
    getSubdirectory: function () {return this.$(".format_editor_list"); },
    'id': function() {
        return this.model.get("id");
    },
    check_for_completion:function(){
       return !this.files.findWhere({preset:null});
    },
    sync_file_changes:function(){
        this.model.set("files", this.files.toJSON());
    },
    load_subfiles:function(){
        var data = {
            collection: this.presets,
            files: this.files,
            el: this.$el.find(".format_editor_list"),
            model: this.model,
            content_node_view:this,
            to_delete: this.to_delete
        }
        this.subcontent_view = new FormatSlotList(data);
        this.update_metadata();
    },
    update_metadata:function(){
        var all_metadata = this.get_metadata();
        this.$(".format_counter").html(all_metadata.count);
        this.$el.find(".format_editor_remove").css("display", (all_metadata.count <=1) ? "none" : "inline");
        this.$(".main_file_remove").css("display", (all_metadata.main_file_count <=1) ? "none" : "inline");
        this.$(".format_size_text").html(stringHelper.format_size(all_metadata.size));
    },
    get_metadata:function(){
        var self = this;
        var count = 0;
        var main_count = 0;
        var size = 0;
        this.model.get("files").forEach(function(file){
            var preset = (file.preset && file.preset.id)? file.preset.id: file.preset;
            if(preset && window.formatpresets.get({id:preset}).get("display")){
                if(!file.preset.id){
                    file.preset = window.formatpresets.get({id:preset}).toJSON();
                }
                count ++;
                if(!file.preset.supplementary){
                    main_count++;
                }
                size += file.file_size;
            }
        });
        return {"count": count, "size": size, "main_file_count" : main_count};
    },
    save_files:function(){

    },
    set_uploading:function(uploading){
        this.containing_list_view.set_uploading(uploading);
    }
});
var FormatInlineItem = FormatEditorItem.extend({
    template: require("./hbtemplates/file_upload_inline_item.handlebars"),
    expandedClass: "glyphicon-triangle-bottom",
    collapsedClass: "glyphicon-triangle-top",

    getToggler: function () { return this.$(".expand_format_editor"); },
    getSubdirectory: function () {return this.$(".format_editor_list"); },
    'id': function() {
        return this.model.get("id");
    },
    initialize: function(options) {
        this.bind_node_functions();
        this.originalData = this.model.toJSON();
        this.containing_list_view = options.containing_list_view;
        this.to_delete = new Models.ContentNodeCollection();
        this.init_collections();
        this.render();
        this.listenTo(this.files, "add", this.sync_file_changes);
        this.listenTo(this.files, "change", this.sync_file_changes);
        this.listenTo(this.files, "remove", this.sync_file_changes);
        this.listenTo(this.model, "change:files", this.update_metadata);
    },
    events: {
        'change .format_options_dropdown' : 'set_initial_format',
        'click .remove_from_dz ' : 'remove_item',
        'click .expand_format_editor' : 'toggle'
    },
    render: function() {
        // this.files.sort_by_preset(this.presets);
        this.presets.sort_by_order();

        this.$el.html(this.template({
            node: this.model.toJSON()
        }));
        this.update_metadata();
    },
    unset_model:function(){

    }
});

var FormatFormatItem = FormatEditorItem.extend({
    template: require("./hbtemplates/file_upload_format_item.handlebars"),

    initialize: function(options) {
        _.bindAll(this, 'update_name', 'set_initial_format', 'remove_item', 'set_thumbnail', 'get_thumbnail');
        this.bind_node_functions();
        this.originalData = this.model.toJSON();
        this.containing_list_view = options.containing_list_view;
        this.init_collections();
        this.initial_file = null;
        this.render();
        this.listenTo(this.files, "add", this.sync_file_changes);
        this.listenTo(this.files, "change", this.sync_file_changes);
        this.listenTo(this.files, "remove", this.sync_file_changes);
        this.listenTo(this.model, "change:files", this.update_metadata);
    },
    events: {
        'change .format_options_dropdown' : 'set_initial_format',
        'click .remove_from_dz ' : 'remove_item',
        'keyup .name_content_input': 'update_name',
        'paste .name_content_input': 'update_name',
        'click .expand_format_editor' : 'toggle'
    },
    set_initial_file: function(){
        this.initial = !this.check_for_completion();
        if(this.initial){
            var self = this;
            this.files.forEach(function(file){
                if(!file.get('preset')){
                    self.initial_file = file;
                }
            })
        }
    },
    render: function() {
        // this.files.sort_by_preset(this.presets);
        this.presets.sort_by_order();
        this.set_initial_file();

        this.$el.html(this.template({
            presets:this.presets.toJSON(),
            files: this.files.toJSON(),
            node: this.model.toJSON(),
            initial: this.initial,
            initial_file:(this.initial_file)? this.initial_file.toJSON() : null
        }));
        this.update_metadata();
        if(!this.initial){
            this.load_subfiles();
        }
        this.set_thumbnail(this.get_thumbnail());
    },

    set_initial_format:function(event){
        this.set_file_format(this.initial_file, window.formatpresets.findWhere({id: event.target.value}));
        this.render();
        this.containing_list_view.handle_completed();
        this.containing_list_view.hide_assigned();
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
        this.collection = options.collection;
        this.files = options.files;
        this.render();

    },
    render: function() {
        this.$el.html(this.template());
        this.load_content();
    },
    create_new_view: function(model){
        var associated_file = null;
        this.files.forEach(function(file){
            if(file.get("preset")){
                var preset_id = (file.get("preset").id)? file.get("preset").id : file.get("preset");
                if(preset_id === model.get("id")){
                    associated_file = file;
                }
            }
        });
        var format_slot = new FormatSlot({
            model: model,
            nodeid : this.model.get("id"),
            file: associated_file,
            containing_list_view: this
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
    }
});

var FormatSlot = BaseViews.BaseListNodeItemView.extend({
    template: require("./hbtemplates/format_item.handlebars"),
    dropzone_template : require("./hbtemplates/format_dropzone_item.handlebars"),
    upload_in_progress:false,

    'id': function() {
        return "format_slot_item_" + this.model.get("id");
    },
    className:"row format_editor_item",
    initialize: function(options) {
        _.bindAll(this, 'remove_item','file_uploaded','file_added','file_removed','file_failed', 'create_dropzone');
        this.containing_list_view = options.containing_list_view;
        this.file = options.file;
        this.originalFile = this.file;
        this.nodeid = options.nodeid;
        this.render();
    },
    events: {
        'click .format_editor_remove ' : 'remove_item'
    },
    render: function() {
        this.$el.html(this.template({
            file: (this.file)? this.file.toJSON() : null,
            preset: this.model.toJSON(),
            nodeid:this.nodeid
        }));
        setTimeout(this.create_dropzone, 100); // Wait for slide down animation to finish
    },
    create_dropzone:function(){
        var dz_selector="#" + this.model.get("id") + "_"  + this.nodeid + "_dropzone" + ((this.file)? "_swap" : "");
        if(this.$(dz_selector).is(":visible")){
            var clickables = [dz_selector + " .dz_click"];
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
                    "Node" : this.nodeid,
                    "Preset": this.model.get("id")
                }
            });
            dropzone.on("success", this.file_uploaded);

            // Only enable the submit upload files button once all files have finished uploading.
            dropzone.on("addedfile", this.file_added);
            dropzone.on("removedfile", this.file_removed);
            dropzone.on("error", this.file_failed);
        }
    },
    get_accepted_files:function(){
        var preset = window.formatpresets.findWhere({id: this.model.id});
        return preset.get("associated_mimetypes").join(",");
    },
    file_uploaded:function(file){
        var new_file = new Models.FileModel({id: JSON.parse(file.xhr.response).object_id});
        var self = this;
        this.fetch_model(new_file).then(function(fetched){
            var originalFile = self.file;
            self.file = fetched;
            self.render();
            self.containing_list_view.set_file_format(self.file, self.model, originalFile);
            self.set_uploading(false);
        });
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
        alert(error);
        this.render();
        this.set_uploading(false);
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
        this.callback(this.file.file_id, this.file.filename, this.alt_text);
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
            alert(this.file_error);
        }
        this.render_dropzone();
    }
});

module.exports = {
    FileUploadView:FileUploadView,
    FileModalView:FileModalView,
    FormatInlineItem:FormatInlineItem,
    ImageUploadView:ImageUploadView
}