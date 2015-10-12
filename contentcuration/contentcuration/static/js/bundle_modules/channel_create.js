var Views = require("new_channel/views");
var Models = require("new_channel/models");
var $ = require("jquery");

$(function(){
	var channelModel1 = new Models.ChannelModel({title: 'Khan Academy', description: 'Default value for testing purposes'});
	var channelModel2 = new Models.ChannelModel({title: 'Learning Equality', description: 'Description of learning equality'});
	var channelModel3 = new Models.ChannelModel({title: 'Another Channel', description: 'Description of this channel'});
	var channelCollection = new Models.ChannelCollection([channelModel1, channelModel2, channelModel3]);
	var new_channel_view = new Views.NewChannelView({
		el: $("#channel-manage-container"),
		model: {channels: channelCollection}
	});
});