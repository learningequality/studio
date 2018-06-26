import { Croppie } from 'croppie';

var Backbone = require("backbone");
var _ = require("underscore");
var BaseViews = require("edit_channel/views");
var Models = require("edit_channel/models");
var Dropzone = require("dropzone");
var get_cookie = require("utils/get_cookie");
require("images.less");
require("dropzone/dist/dropzone.css");
require("croppie/croppie.css");
var dialog = require("edit_channel/utils/dialog");

const CHANNEL_ASPECT_RATIO = { width: 130,  height: 130 };
const CHANNEL_CROP_BOUNDARY = { width: CHANNEL_ASPECT_RATIO.width + 20,  height: CHANNEL_ASPECT_RATIO.height + 20 };
const THUMBNAIL_ASPECT_RATIO = { width: 160,  height: 90 };
const THUMBNAIL_CROP_BOUNDARY = { width: THUMBNAIL_ASPECT_RATIO.width + 10,  height: THUMBNAIL_ASPECT_RATIO.height + 10 };

var NAMESPACE = "image";
var MESSAGES = {
    "upload": "Upload",
    "submit": "Submit",
    "use": "USE",
    "image_error": "Image Error",
    "file_error_text": "Error uploading file: connection interrupted",
    "unable_to_generate": "Unable to generate thumbnail for this item",
    "removing_image": "Removing Image",
    "removing_image_text": "Are you sure you want to remove this image?",
    "alt_prompt": "Enter text to display if image fails to load",
    "drop_prompt": "Click or drop file here...",
    "adding_image": "Adding image to exercise",
    "generate": "Generate",
    "generate_thumbnail_text": "Click 'Generate' to create a thumbnail",
    "recenter_thumbnail": "Recenter/Crop",
    "no_space": "Not enough space. Check your storage under Settings page.",
}

var ThumbnailUploadView = BaseViews.BaseView.extend({
    template: require("./hbtemplates/thumbnail_upload.handlebars"),
    preview_template: require("./hbtemplates/thumbnail_preview.handlebars"),
    dropzone_template: require("./hbtemplates/thumbnail_dropzone.handlebars"),
    name: NAMESPACE,
    $trs: MESSAGES,
    initialize: function(options) {
        _.bindAll(this, 'image_uploaded','image_added','image_removed','create_dropzone', 'image_completed','image_failed',
                         'use_image', 'create_croppie', 'cancel_croppie', 'submit_image', 'get_croppie_encoding', 'submit_croppie');
        this.image_url = options.image_url;
        this.image = _.find(this.model.get('files'), function(f){ return f.preset.thumbnail; });
        if(this.image){
            this.image = new Models.FileModel(this.image);
        }
        this.thumbnail_encoding = this.model.get('thumbnail_encoding');
        this.original_thumbnail_encoding = this.thumbnail_encoding;
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
        this.aspect_ratio = (options.is_channel)? CHANNEL_ASPECT_RATIO : THUMBNAIL_ASPECT_RATIO;
        this.boundary = (options.is_channel)? CHANNEL_CROP_BOUNDARY : THUMBNAIL_CROP_BOUNDARY;
        this.cropping = false;
        this.render();
        this.dropzone = null;
        this.image_success = true;
    },
    events: {
        'click .remove_image ' : 'remove_image',
        'click .open_thumbnail_generator': 'open_thumbnail_generator',
        'click .crop_image': 'create_croppie',
        'click .cancel_image': 'cancel_croppie',
        'click .submit_image': 'submit_croppie'
    },
    render: function() {
        var thumbnail_src = this.get_thumbnail_url();
        if(this.allow_edit){
            this.$el.html(this.template({
                picture : thumbnail_src,
                selector: this.get_selector(),
                show_generate: this.model.get('kind') != undefined,
                not_default: thumbnail_src != this.default_url,
                cropping: this.cropping,
            }, {
                data: this.get_intl_data()
            }));
            if(!this.cropping) {
                _.defer(this.create_dropzone, 1000);
            }
        }else{
            this.$el.html(this.preview_template({
                picture : thumbnail_src,
                name: this.model.get('title')
            }));
        }
    },

    /*********** GET IMAGE INFORMATION ***********/
    get_selector: function(){
        return "dropzone_image_" + this.cid;
    },
    get_thumbnail_url:function(ignore_encoding){
        var thumbnail = _.find(this.model.get('files'), function(f){ return f.preset.thumbnail; });
        if(!ignore_encoding && this.thumbnail_encoding){
            if(typeof this.thumbnail_encoding === "string")
                this.thumbnail_encoding = JSON.parse(this.thumbnail_encoding);
            return this.thumbnail_encoding.base64;
        }
        else if(this.image_url){ return this.image_url; }
        else if(thumbnail){ return thumbnail.storage_url; }
        else if(this.model.get('kind') != undefined) { return "/static/img/" + this.model.get("kind") + "_placeholder.png"; }
        else{ return "/static/img/kolibri_placeholder.png"; }
    },

    /*********** UPDATE IMAGE FIELDS ***********/
    remove_image: function(){
        var self = this;
        dialog.dialog(this.get_translation("removing_image"), this.get_translation("removing_image_text"), {
            [this.get_translation("cancel")]:function(){},
            [this.get_translation("remove")]: function(){
                self.image = null;
                self.image_url = self.default_url;
                self.thumbnail_encoding = null;
                self.onremove();
                self.render();
            },
        }, function(){});
    },
    submit_image:function(){
        this.original_thumbnail_encoding = this.thumbnail_encoding;
        if(this.onsuccess){ this.onsuccess(this.image, this.thumbnail_encoding, this.image_formatted_name, this.image_url); }
        if(this.onfinish){ this.onfinish(); }
    },

    /*********** CROPPIE FUNCTIONS ***********/
    create_croppie:function(){
        this.cropping = true;
        this.render();
        this.$(".finished_area").css("visibility", "visible");
        var selector = "#" + this.get_selector() + "_placeholder";
        var self = this;
        this.croppie = new Croppie(this.$(selector).get(0),{
            boundary: this.boundary,
            viewport: this.aspect_ratio,
            showZoomer: false,
            customClass: "crop-img",
            update: function(result) { _.defer(function() {self.get_croppie_encoding(result);}, 500); }
        });
        this.croppie.bind({
            points: (this.thumbnail_encoding)? this.thumbnail_encoding.points : [],
            zoom: (this.thumbnail_encoding)? this.thumbnail_encoding.zoom : 1,
            url: this.get_thumbnail_url(true)
        }).then(function(){})
    },
    cancel_croppie: function(){
        this.cropping = false;
        this.thumbnail_encoding = this.original_thumbnail_encoding;
        this.render();
    },
    submit_croppie: function(){
        this.cropping = false;
        this.get_croppie_encoding(this.croppie.get());
        this.submit_image();
        this.render();
    },
    get_croppie_encoding: function(result){
        var self = this;
        this.croppie.result({type: 'base64', size: this.aspect_ratio}).then(function(image){
            if(!self.thumbnail_encoding || self.thumbnail_encoding.points !== result.points || self.thumbnail_encoding.zoom !== result.zoom){
                self.thumbnail_encoding = {
                    "points": result.points,
                    "zoom": result.zoom,
                    "base64": image
                };
            }
        });
    },

    /*********** GENERATE IMAGE FUNCTIONS ***********/
    open_thumbnail_generator:function(){
        var thumbnail_modal = new ThumbnailModalView({
            node: this.model,
            onuse: this.use_image,
            model: this.image
        });
    },
    use_image:function(file){
        this.image = file;
        this.image_url = file.get('storage_url');
        this.thumbnail_encoding = null;
        this.render();
        this.submit_image();
    },

    /*********** DROPZONE FUNCTIONS ***********/
    create_dropzone:function(){
        var selector = "#" + this.get_selector();
        Dropzone.autoDiscover = false;
        if(this.$(selector).is(":visible")){
            this.dropzone = new Dropzone(this.$(selector).get(0), {
                maxFiles: 1,
                clickable: [selector + "_placeholder", selector + "_swap"],
                acceptedFiles: this.acceptedFiles,
                url: this.upload_url,
                previewTemplate:this.dropzone_template(null, { data: this.get_intl_data() }),
                previewsContainer: selector,
                headers: {"X-CSRFToken": get_cookie("csrftoken"), "Preset": this.preset_id, "Node": this.model.id}
            });
            this.dropzone.on("success", this.image_uploaded);
            this.dropzone.on("addedfile", this.image_added);
            this.dropzone.on("removedfile", this.image_removed);
            this.dropzone.on("queuecomplete", this.image_completed);
            this.dropzone.on("error", this.image_failed);
        }
    },
    image_failed:function(data, error, xhr){
        this.image_error = (xhr && xhr.status === 403) ? this.get_translation("no_space") : error;
    },
    image_added:function(thumbnail){
        this.image_error = this.get_translation("file_error_text");
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
    image_uploaded:function(image){
        this.image_error = null;
        var result = JSON.parse(image.xhr.response)
        if(result.file){
            this.image = new Models.FileModel(JSON.parse(result.file));
        }
        this.image_url = result.path;
        this.image_formatted_name = result.formatted_filename;
    },
    image_completed:function(){
        if(this.image_error){
            var self = this;
            dialog.alert(this.get_translation("image_error"), this.image_error);
            if(this.onerror){ this.onerror(); }
            this.render();
        } else{
            this.thumbnail_encoding = null;
            this.render();
            this.submit_image();
        }
    }
});

var ThumbnailModalView = BaseViews.BaseModalView.extend({
    id: "thumbnail_modal_wrapper",
    template: require("./hbtemplates/thumbnail_generator_modal.handlebars"),
    img_template: require("./hbtemplates/thumbnail_generator_preview.handlebars"),
    name: NAMESPACE,
    $trs: MESSAGES,
    initialize: function(options) {
        _.bindAll(this, "generate_thumbnail", 'use_thumbnail', 'render_preview', "init_focus");
        this.modal = true;
        this.node = options.node;
        this.onuse = options.onuse;
        this.render();
    },
    events: {
        'click #generate_thumbnail' : 'generate_thumbnail',
        'click #use_thumbnail' : 'use_thumbnail',
        "focus .input-tab-control": "loop_focus"
    },
    render: function() {
        this.$el.html(this.template(null, {
            data: this.get_intl_data()
        }));
        $("body").append(this.el);
        this.$("#thumbnail_modal").modal({show: true});
        this.$("#thumbnail_modal").on("hide.bs.modal", this.close);
        this.render_preview()
        this.$(".modal").on("hide.bs.modal", this.close);
        this.$(".modal").on("hidden.bs.modal", this.closed_modal);
        this.$(".modal").on("shown.bs.modal", this.init_focus);
    },
    init_focus: function(){
        this.set_indices();
        this.set_initial_focus();
    },
    render_preview:function(){
        this.$("#thumbnail_preview").html(this.img_template({
          model: this.model? this.model.toJSON() : null
        }, {
            data: this.get_intl_data()
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
            self.$("#generate_thumbnail_error").text((error.status === 403) ? self.get_translation("no_space") : self.get_translation("unable_to_generate"));
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
    className: "exercise_image_upload_modal",
    name: NAMESPACE,
    $trs: MESSAGES,
    initialize: function(options) {
        _.bindAll(this, "file_uploaded", "file_added", "file_removed", "file_failed", "submit_file", "file_complete", "set_alt_text", "init_focus", "render_dropzone");
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
        "change #alt_text_box": "set_alt_text",
        "focus .input-tab-control": "loop_focus"
    },

    render: function() {
        this.$el.html(this.modal_template(null, {
            data: this.get_intl_data()
        }));
        $("body").append(this.el);
        this.$(".modal").modal({show: true});
        this.$(".modal").on("hide.bs.modal", this.close);
        this.$(".modal").on("hidden.bs.modal", this.closed_modal);
        this.$(".modal").on("shown.bs.modal", this.init_focus);
        _.defer(this.render_dropzone);
    },
    init_focus: function(){
        this.set_indices();
        this.set_initial_focus();
    },
    render_dropzone:function(){
        this.$(".modal-body").html(this.template({file: this.file, alt_text: this.alt_text}, { data: this.get_intl_data() }));
        Dropzone.autoDiscover = false;
        if(this.$("#dropzone").get(0)){
            this.dropzone = new Dropzone(this.$("#dropzone").get(0), {
                maxFiles: 1,
                clickable: ["#dropzone", "#dropzone_placeholder"],
                acceptedFiles: window.formatpresets.get({id:this.preset_id}).get('associated_mimetypes').join(','),
                url: window.Urls.exercise_image_upload(),
                thumbnailWidth:null,
                thumbnailHeight:null,
                previewTemplate:this.dropzone_template(null, { data: this.get_intl_data() }),
                previewsContainer: "#dropzone",
                headers: {"X-CSRFToken": get_cookie("csrftoken")}
            });
            this.dropzone.on("success", this.file_uploaded);
            this.dropzone.on("addedfile", this.file_added);
            this.dropzone.on("removedfile", this.file_removed);
            this.dropzone.on("error", this.file_failed);
            this.dropzone.on("queuecomplete", this.file_complete);
        }
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
        this.file_error = this.get_translation("file_error_text");
        this.$("#dropzone_placeholder").css("display", "none");
    },
    file_removed:function(){
        this.file_error = null;
        this.file = null;
        _.defer(this.render_dropzone);
    },
    file_failed:function(data, error, xhr){
        this.file_error = (xhr && xhr.status === 403) ? this.get_translation("no_space") : error;
    },
    file_complete:function(){
        if(this.file_error){
            dialog.alert(this.get_translation("image_error"), this.file_error);
        }
        _.defer(this.render_dropzone);
    }
});

module.exports = {
    ThumbnailUploadView: ThumbnailUploadView,
    ImageUploadView:ImageUploadView
}
