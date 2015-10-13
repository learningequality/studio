var Views = require("new_channel/views");
var Models = require("new_channel/models");
var $ = require("jquery");

$(function(){
	var dummyDescription = "Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua";
	var channelModel1 = new Models.ChannelModel({title: 'Khan Academy', description: 'Default value for testing purposes'});
	var channelModel2 = new Models.ChannelModel({title: 'Learning Equality', description: 'Description of learning equality'});
	var channelModel3 = new Models.ChannelModel({title: 'This is a very long name for a channel title', description: dummyDescription + dummyDescription + dummyDescription + dummyDescription + dummyDescription});
	var channelCollection = new Models.ChannelCollection([channelModel1, channelModel2, channelModel3]);
	var new_channel_view = new Views.NewChannelView({
		el: $("#channel-manage-container"),
		model: {channels: channelCollection}
	});
});