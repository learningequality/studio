var Views = require("edit_channel/new_channel/views");
var Models = require("edit_channel/models");
var Backbone = require("backbone");
var ChannelEditRouter = require("edit_channel/router");

$(function() {
    $("#channel-publish-button").on("click", publish_nodes);
    $("#channel-activate-button").on("click", approve_channel);
    $("#publish-id-copy").on("click", function(){ copy_publish_id($("#publish_id_text")[0]); });
    $("#modal-copy-btn").on("click", function(){ copy_publish_id($("#modal-copy-text")[0]); });
    $("#channel_settings").on("click", open_channel_settings);
    if(window.channel){
        window.current_channel = new Models.ChannelModel(window.channel);
        window.current_channel.fetch({async:false});
    }
    $("#channel-edit-content-wrapper").on("click", close_popups);
    // $("#admin-page").on("click", close_ids);
});

function open_channel_settings(){
    window.workspace_manager.get_main_view().open_channel_settings();
}

function close_popups(){
    window.workspace_manager.get_main_view().close_all_popups();
}

function publish_nodes(){
    window.workspace_manager.get_main_view().publish();
}

function approve_channel(){
    window.workspace_manager.get_main_view().activate_channel();
}

function copy_publish_id(text_element){
    text_element.focus();
    text_element.select();
    try {
        document.execCommand("copy");
        $("#publish-id-copy").removeClass("glyphicon-copy").addClass("glyphicon-ok");
    } catch(e) {
        $("#publish-id-copy").removeClass("glyphicon-copy").addClass("glyphicon-remove");
    }
    setTimeout(function(){
    	$("#publish-id-copy").removeClass("glyphicon-ok").removeClass("glyphicon-remove").addClass("glyphicon-copy");
    }, 2500);
}

module.exports = {
    $: $,
    ChannelEditRouter: ChannelEditRouter,
    Backbone: Backbone
};