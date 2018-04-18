var Views = require("edit_channel/new_channel/views");
var Models = require("edit_channel/models");
var Backbone = require("backbone");
var ChannelEditRouter = require("edit_channel/router");
require('../handlebars/helpers.js');

$(function() {
    $("#channel-publish-button").on("click", publish_nodes);
    $("#channel-activate-button").on("click", approve_channel);
    $("#get_published_id").on("click", get_published_id);
    $("#channel_settings").on("click", open_channel_settings);
    if(window.channel){
        window.current_channel = new Models.ChannelModel(window.channel);
        window.current_channel.fetch({async:false});
    }
    $("#channel-edit-content-wrapper").on("click", close_popups);
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

function get_published_id(){
    window.workspace_manager.get_main_view().get_channel_id();
}

window.bundle = module.exports = {
    $: $,
    ChannelEditRouter: ChannelEditRouter,
    Backbone: Backbone
};
