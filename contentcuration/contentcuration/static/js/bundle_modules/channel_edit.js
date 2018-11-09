// include all logic in "base" entrypoint
require('./base');

var Backbone = require("backbone");
const State = require("edit_channel/state");
const WorkspaceManager = require("../edit_channel/utils/workspace_manager");
// Require the router object so that it is ready for Backbone history start call.
require("../edit_channel/router");

$(function() {
    $("#channel-publish-button").on("click", publish_nodes);
    $("#channel-activate-button").on("click", approve_channel);
    $("#get_published_id").on("click", get_published_id);
    $("#channel_settings").on("click", open_channel_settings);
    if(State.current_channel){
        State.current_channel.fetch({async:false});
    }
    $("#channel-edit-content-wrapper").on("click", close_popups);

    Backbone.history.start({
      pushState: true,
      // set in Django template
      root: window.url,
    });
});

function open_channel_settings(){
    WorkspaceManager.get_main_view().open_channel_settings();
}

function close_popups(){
    WorkspaceManager.get_main_view().close_all_popups();
}

function publish_nodes(){
    WorkspaceManager.get_main_view().publish();
}

function approve_channel(){
    WorkspaceManager.get_main_view().activate_channel();
}

function get_published_id(){
    WorkspaceManager.get_main_view().get_channel_id();
}
