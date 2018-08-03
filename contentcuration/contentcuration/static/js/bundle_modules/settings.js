// include all logic in "base" entrypoint
require('./base');

var dialog = require("edit_channel/utils/dialog");
var stringHelper = require("edit_channel/utils/string_helper");

$(function() {
    // Export data call
    $("#export_data").click(function(ev) {
        $.ajax({
            method:"POST",
            url: window.Urls.export_user_data(window.email),
            error: function() {
                dialog.alert(stringHelper.translate("export_title"), stringHelper.translate("export_error_text"));
            },
            success: function(data) {
                dialog.alert(stringHelper.translate("export_title"), stringHelper.translate("export_text"));
            }
        });
    });
    // Enable
    $(".setting_input").on("keydown", function(event){
        $("#save").attr("disabled", false)
    });

    // Enable DELETE ACCOUNT button if email is correct
    $("#email_confirm").keyup(function(event) {
        $(".error").css("display", "none");
        (event.target.value == window.email) ?
            $("#submit_delete_account").removeClass("disabled").removeAttr("disabled") :
            $("#submit_delete_account").addClass("disabled").attr("disabled", true);
    });

    // Clear email field when modal is closed
    $('#deleteAccountModal').on('hidden.bs.modal', resetDeleteModal);

    // Delete account call
    $("#submit_delete_account").click(function(ev) {
        if(!$("#submit_delete_account").attr("disabled")) {
            $("#submit_delete_account").addClass("disabled").attr("disabled", true);
            $(".pending-delete").css("display", "inline");
            $.ajax({
                method:"POST",
                url: window.Urls.delete_user_account($("#email_confirm").val()),
                error: showDeleteError,
                success: function(data) {
                    window.location = "/settings/account/deleted";
                }
            });
        }
    });
});

function resetDeleteModal() {
    $(".pending-delete").css("display", "none");
    $(".error").css("display", "none");
    $("#email_confirm").val("");
    $("#submit_delete_account").addClass("disabled").attr("disabled", true);
}

function showDeleteError() {
    resetDeleteModal();
    $(".error").css("display", "block");
}
