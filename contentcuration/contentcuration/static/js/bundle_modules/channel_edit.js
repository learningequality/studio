var Views = require("edit_channel/new_channel/views");
var Models = require("edit_channel/models");
var Backbone = require("backbone");
var ChannelEditRouter = require("edit_channel/router");

$(function() {
	$("#channel-publish-button").on("click", publish_nodes);
	$("#publish-id-help").on("click", show_publish_help);
	$(".copy-id-btn").on("click", copy_publish_id);
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
	$(".publish-id-text")[0].focus();
	$(".publish-id-text")[0].select();
	try {
    	document.execCommand("copy");
    	$("#publish-id-copy").removeClass("glyphicon-copy").addClass("glyphicon-ok");
    	$("#modal-copy-btn").text("Copied!");
    } catch(e) {
        $("#publish-id-copy").removeClass("glyphicon-copy").addClass("glyphicon-remove");
        $("#modal-copy-btn").text("Copy Failed");
    }
    setTimeout(function(){
    	$("#publish-id-copy").removeClass("glyphicon-ok").removeClass("glyphicon-remove").addClass("glyphicon-copy");
    	$("#modal-copy-btn").text("COPY");
    }, 2500);
}

module.exports = {
	$: $,
	ChannelEditRouter: ChannelEditRouter,
	Backbone: Backbone
};