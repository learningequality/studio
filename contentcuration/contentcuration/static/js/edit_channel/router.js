/* Todo: Remove this (testing purposes only)*/
var ClipboardViews = require("edit_channel/clipboard/views");
var PreviewerViews = require("edit_channel/previewer/views");

/* TODO: REMOVE THIS LATER ONCE REFERENCE DB */
var Models = require("edit_channel/models");
var channelModel = new Models.ChannelModel({name: 'Khan Academy', description: 'Default value for testing purposes');

/*
var Models = require("edit_channel/models");
var topicNodeModel = new Models.TopicNodeModel({title:'Khan Academy', description:'This is a sample description'});
var topicNode1 = new Models.TopicNodeModel({parent: topicNodeModel, title:'Math', description: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua'});
var topicNode2 = new Models.TopicNodeModel({parent: topicNodeModel, title:'Science', description: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua'});
var topicNodeCollection = new Models.TopicNodeCollection([topicNodeModel, topicNode1, topicNode2]);
*/


ChannelEditRouter  = Backbone.Router.extend({
    initialize: function() {
        _.bindAll(this);
		this.default_channel = channelModel;
    },

    routes: {
		"": "navigate_default_channel",
		":channel/(*splat)":    "navigate_channel"
    },
	
	navigate_default_channel: function() {
        this.navigate(this.default_channel + "/", {trigger: true, replace: true});
    },
	
	navigate_channel: function(channel, splat) {
        if (this.channel!==channel) {
            this.control_view = new SidebarView({
                channel: channel,
                entity_key: "children",
                entity_collection: TopicCollection
            });
            this.channel = channel;
        }
        this.navigate_splat(splat);
    }
});
