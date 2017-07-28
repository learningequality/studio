var Backbone = require("backbone");
var _ = require("underscore");
var BaseViews = require("edit_channel/views");
var Models = require("edit_channel/models");
var Images = require("edit_channel/image/views");
require("channel_settings.less");

var NAMESPACE = "channelSettings";
var MESSAGES = {
    "of": "of",
    "videos": "Videos",
    "audio": "Audio",
    "html": "HTML Apps",
    "documents": "Documents",
    "author": "Author",
    "license": "License",
    "saved": "SAVED!",
    "copyright_holder": "Copyright Holder",
    "header": "CHANNEL SETTINGS",
    "save_changes": "SAVE CHANGES",
    "channel_name": "Channel Name",
    "channel_name_error": "Channel name cannot be blank.",
    "channel_name_placeholder": "Enter channel name...",
    "channel_description": "Channel Description",
    "description_placeholder": "Enter channel description...",
    "content_defaults": "Content Defaults",
    "content_defaults_prompt": "Set defaults for new content items",
    "exercise_criteria": "Exercise Mastery Criteria",
    "auto_thumbnail": "Automatically generate thumbnails for...",
    "author_placeholder": "Enter author name...",
    "license_description_placeholder": "Enter license description...",
    "copyright_holder_placeholder": "Enter copyright holder name...",
    "language": "Language",
    "select_language": "Select a Language..."
}

var SettingsModalView = BaseViews.BaseModalView.extend({
    template: require("./hbtemplates/settings_modal.handlebars"),
    name: NAMESPACE,
    $trs: MESSAGES,
    initialize: function(options) {
        this.parent_view = options.parent_view;
        this.modal = true;
        this.render(this.close, {});
        this.settings_view = new SettingsView({
            el: this.$(".modal-body"),
            modal: this,
            model: this.model,
            onsave: options.onsave
        });
        this.$("#channel_settings_modal").on("shown.bs.modal", this.settings_view.init_focus);
    }
});


var SettingsView = BaseViews.BaseListEditableItemView.extend({
    template: require("./hbtemplates/settings_dialog.handlebars"),
    name: NAMESPACE,
    $trs: MESSAGES,
    initialize: function(options) {
        _.bindAll(this, "set_thumbnail", "reset_thumbnail", "remove_thumbnail", "init_focus");
        this.modal = options.modal;
        this.onsave = options.onsave;
        this.thumbnail_url = this.model.get("thumbnail_url");
        this.thumbnail = this.model.get("thumbnail");
        this.render();
    },
    events: {
      "click #settings_submit": "submit_changes",
      "change .input_listener": "register_changes",
      "keyup .input_listener": "register_changes",
      "focus .input-tab-control": "loop_focus"
    },
    render: function() {
        this.$el.html(this.template({
            channel: this.model.toJSON(),
            licenses: window.licenses.toJSON(),
            preferences: this.model.get("preferences"),
            languages: window.languages.toJSON()
        },  {
            data: this.get_intl_data()
        }));
        $("#license_select").val(this.get_license_id(this.model.get("preferences").license));
        $("#mastery_model_select").val(this.model.get("preferences").mastery_model);
        $("#custom_license_description").css("display", (this.get_license_name()==="Special Permissions")? "block" : "none");
        $("#mastery_custom_criterion").css("visibility", ($("#mastery_model_select").val()==="m_of_n")? "visible" : "hidden");
        $("#select_language").val(this.model.get("language") || 0);
        this.image_upload = new Images.ThumbnailUploadView({
            model: this.model,
            el: this.$("#channel_thumbnail"),
            preset_id: "channel_thumbnail",
            upload_url: window.Urls.thumbnail_upload(),
            acceptedFiles: "image/jpeg,image/jpeg,image/png",
            image_url: this.thumbnail_url,
            default_url: "/static/img/kolibri_placeholder.png",
            onsuccess: this.set_thumbnail,
            onerror: this.reset_thumbnail,
            oncancel:this.enable_submit,
            onstart: this.disable_submit,
            onremove: this.remove_thumbnail,
            allow_edit: true,
            is_channel: true
        });
    },
    init_focus: function(){
        this.set_indices();
        this.set_initial_focus();
    },
    get_license_id: function(license_name){
        return window.licenses.findWhere({license_name: license_name}).id;
    },
    get_license_name: function(){
        return window.licenses.get($("#license_select").val()).get("license_name");
    },
    submit_changes:function(){
        var preferences = this.model.get("preferences");
        preferences.license = this.get_license_name();
        preferences.author = $("#author_field").val().trim();
        preferences.copyright_holder = $("#input_copyright_holder").val().trim();
        preferences.license_description = $("#custom_license_description").val().trim();
        preferences.mastery_model = $("#mastery_model_select").val();
        preferences.m_value = $("#m_value").val();
        preferences.n_value = $("#n_value").val();
        preferences.auto_derive_video_thumbnail = $("#auto_video_thumbnail").is(":checked");
        preferences.auto_derive_audio_thumbnail = $("#auto_audio_thumbnail").is(":checked");
        preferences.auto_derive_document_thumbnail = $("#auto_document_thumbnail").is(":checked");
        preferences.auto_derive_html5_thumbnail = $("#auto_html5_thumbnail").is(":checked");
        var language = $("#select_language").val();
        var self = this;
        $("#settings_submit").html(this.get_translation("saving"))
                            .attr("disabled", "disabled")
                            .addClass("disabled");
        this.save({
            "name": $("#input_title").val().trim(),
            "description": $("#input_description").val(),
            "thumbnail": this.model.get("thumbnail"),
            "preferences": JSON.stringify(preferences),
            "language": (language===0)? null : language
        }).then(function(data){
            self.onsave(data);
            console.log(data)
            $("#settings_submit").html(self.get_translation("saved"));
            setTimeout(function(){
                $("#settings_submit").html(self.get_translation("no_changes_detected"));
            }, 2000);
        });
    },
    register_changes:function(){
        $("#custom_license_description").css("display", (this.get_license_name()==="Special Permissions")? "block" : "none");
        $("#mastery_custom_criterion").css("visibility", ($("#mastery_model_select").val()==="m_of_n")? "visible" : "hidden");
        if(Number($("#m_value").val()) > Number($("#n_value").val())) {
            $("#n_value").val($("#m_value").val());
        }
        $("#settings_submit").html(this.get_translation("save_changes"));

        var isvalid = $("#input_title").val().trim() !== "";
        $("#channel_error").css("display", (isvalid)? "none" : "inline-block");
        if(isvalid){
            $("#settings_submit").attr("disabled", false);
            $("#settings_submit").removeClass("disabled");
        } else {
            $("#settings_submit").attr("disabled", "disabled");
            $("#settings_submit").addClass("disabled");
        }
    },
    reset_thumbnail:function(){
        this.render();
        this.register_changes();
    },
    remove_thumbnail:function(){
        this.model.set("thumbnail", "/static/img/kolibri_placeholder.png");
        this.register_changes();
    },
    set_thumbnail:function(thumbnail, encoding, formatted_name, path){
        this.model.set("thumbnail", formatted_name);
        this.model.set("thumbnail_encoding", encoding)
        this.register_changes();
    },
    set_editing: function(edit_mode_on){
        this.containing_list_view.set_editing(edit_mode_on);
    },
    disable_submit:function(){
        this.$("#settings_submit").attr("disabled", "disabled");
        this.$("#settings_submit").addClass("disabled");
    },
});

module.exports = {
    SettingsModalView: SettingsModalView,
    SettingsView:SettingsView
}
