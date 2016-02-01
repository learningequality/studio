var Views = require("edit_channel/new_channel/views");
var Models = require("edit_channel/models");
var Backbone = require("backbone");
var ChannelEditRouter = require("edit_channel/router");
var $ = require("jQuery");

$(function() {
	/*
	if (window.channels) {
		var channel_collection = new Models.ChannelCollection(window.channels);
		var topic_collection = new Models.TopicNodeCollection(window.topic_nodes);
		var topictree_collection = new Models.TopicTreeModelCollection(window.topic_trees);
		var content_collection = new Models.ContentNodeCollection(window.content_nodes);
		var channel_manager = new Views.ManageChannelsView ({
			el: $("#channel-container"),
			model: this.model,
			channel_collection : channel_collection,
			topictree_collection : topictree_collection
		});
	}*/
	$("#channel-publish-button").on("click", publish_nodes);
});

function publish_nodes(){
	$("#main-content-area").find(".to_publish").each(function(){
		console.log("Publishing...");
		/*TODO: call .publish method of items (.data("data"))*/
	});
}

module.exports = {
	$: $,
	ChannelEditRouter: ChannelEditRouter,
	Backbone: Backbone
};