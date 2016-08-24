var Views = require("edit_channel/new_channel/views");
var Models = require("edit_channel/models");
var Backbone = require("backbone");
var ChannelEditRouter = require("edit_channel/router");

$(function() {
	$("#channel-publish-button").on("click", publish_nodes);
	$("#publish-id-help").on("click", show_publish_help);
	$("#publish-id-copy").on("click", copy_publish_id);
	if(window.channel){
		window.current_channel = new Models.ChannelModel(window.channel);
		window.current_channel.fetch({async:false});
	}
});

function publish_nodes(){
	window.workspace_manager.get_main_view().publish();
}

function show_publish_help(){
	$("#publish-help-modal").modal("show");
}

function copy_publish_id(){
	$("#publish-id-text").focus();
	$("#publish-id-text").select();
	try {
    	document.execCommand("copy");
    } catch(e) {
        $("#publish-copy-success").text("Copy failed");
    }

    $("#publish-copy-success").css("display", "inline");
    setTimeout(function(){
    	$("#publish-copy-success").css("display", "none");
    	$("#publish-copy-success").text("Copied!");
    }, 2500);
}

module.exports = {
	$: $,
	ChannelEditRouter: ChannelEditRouter,
	Backbone: Backbone
};