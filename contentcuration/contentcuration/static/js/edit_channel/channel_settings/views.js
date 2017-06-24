var Backbone = require("backbone");
var _ = require("underscore");
var BaseViews = require("edit_channel/views");
var Models = require("edit_channel/models");
var FileViews = require("edit_channel/file_upload/views");
require("channel_settings.less");

var SettingsModalView = BaseViews.BaseModalView.extend({
    template: require("./hbtemplates/settings_modal.handlebars"),

    initialize: function(options) {
        this.parent_view = options.parent_view;
        this.modal = true;
        this.render(this.close, {});
        this.settings_view = new SettingsView({
            el: this.$(".modal-body"),
            modal : this,
            model: this.model,
            onsave: options.onsave
        });
    }
});


var SettingsView = BaseViews.BaseListEditableItemView.extend({
    template: require("./hbtemplates/settings_dialog.handlebars"),
    initialize: function(options) {
        this.modal = options.modal;
        this.onsave = options.onsave;
        this.thumbnail_url = this.model.get("thumbnail_url");
        this.thumbnail = this.model.get("thumbnail");
        this.render();
    },
    events: {
      "click #settings_submit" : "submit_changes",
      "change .input_listener" : "register_changes",
      "keyup .input_listener" : "register_changes"
    },
    render: function() {
        this.$el.html(this.template({
            channel: this.model.toJSON(),
            licenses: window.licenses.toJSON(),
            preferences: this.model.get('preferences')
        }));
        $("#license_select").val(this.get_license_id(this.model.get('preferences').license));
        $("#mastery_model_select").val(this.model.get('preferences').mastery_model);
        $("#custom_license_description").css('display', (this.get_license_name()==="Special Permissions")? "block" : "none");
        $("#mastery_custom_criterion").css('visibility', ($("#mastery_model_select").val()==="m_of_n")? "visible" : "hidden");
        this.image_upload = new FileViews.ThumbnailUploadView({
            model: this.model,
            el: this.$("#channel_thumbnail"),
            preset_id: 'channel_thumbnail',
            upload_url: window.Urls.thumbnail_upload(),
            acceptedFiles: 'image/jpeg,image/jpeg,image/png',
            image_url: this.thumbnail_url,
            default_url: "/static/img/kolibri_placeholder.png",
            onsuccess: this.set_thumbnail,
            onerror: this.reset_thumbnail,
            oncancel:this.enable_submit,
            onstart: this.disable_submit,
            onremove: this.remove_thumbnail,
            allow_edit: true
        });
    },
    get_license_id: function(license_name){
        return window.licenses.findWhere({license_name: license_name}).id;
    },
    get_license_name: function(){
        return window.licenses.get($("#license_select").val()).get('license_name');
    },
    submit_changes:function(){
        var preferences = this.model.get('preferences');
        preferences["license"] = this.get_license_name();
        preferences["author"] = $("#author_field").val().trim();
        preferences["copyright_holder"] = $("#input_license_owner").val().trim();
        preferences["license_description"] = $("#custom_license_description").val().trim();
        preferences["mastery_model"] = $("#mastery_model_select").val();
        preferences["m_value"] = $("#m_value").val();
        preferences["n_value"] = $("#n_value").val();
        preferences["auto_derive_video_thumbnail"] = $("#auto_video_thumbnail").is(":checked");
        preferences["auto_derive_audio_thumbnail"] = $("#auto_audio_thumbnail").is(":checked");
        preferences["auto_derive_document_thumbnail"] = $("#auto_document_thumbnail").is(":checked");
        preferences["auto_derive_html5_thumbnail"] = $("#auto_html5_thumbnail").is(":checked");
        var self = this;
        $("#settings_submit").html("Saving...");
        $("#settings_submit").attr('disabled', 'disabled');
        $("#settings_submit").addClass('disabled');
        this.save({
            "name": $("#input_title").val().trim(),
            "description": $("#input_description").val(),
            "thumbnail": this.model.get('thumbnail'),
            "preferences": JSON.stringify(preferences)
        }).then(function(data){
            self.onsave(data)
            $("#settings_submit").html("SAVED!");
            setTimeout(function(){
                $("#settings_submit").html("No Changes Found");
            }, 2000);
        });
    },
    register_changes:function(){
        $("#custom_license_description").css('display', (this.get_license_name()==="Special Permissions")? "block" : "none");
        $("#mastery_custom_criterion").css('visibility', ($("#mastery_model_select").val()==="m_of_n")? "visible" : "hidden");
        if(Number($("#m_value").val()) > Number($("#n_value").val())) $("#n_value").val($("#m_value").val());
        $("#settings_submit").html("SAVE CHANGES");

        var isvalid = $("#input_title").val().trim() !== "";
        $("#channel_error").css('display', (isvalid)? "none" : "inline-block");
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
        this.enable_submit();
    },
    remove_thumbnail:function(){
        this.thumbnail = null;
        this.thumbnail_url = "/static/img/kolibri_placeholder.png";
        this.enable_submit();
    },
    set_thumbnail:function(thumbnail, formatted_name, path){
        this.thumbnail = formatted_name;
        this.thumbnail_url = path;
        this.enable_submit();
    },
    set_editing: function(edit_mode_on){
        this.containing_list_view.set_editing(edit_mode_on);
    },
    enable_submit:function(){
        this.$("#settings_submit").removeAttr("disabled");
        this.$("#settings_submit").removeClass("disabled");
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
