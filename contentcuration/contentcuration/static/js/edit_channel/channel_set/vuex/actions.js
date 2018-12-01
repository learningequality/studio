var _ = require('underscore');
var utils = require('../util');
var loadChannelSetChannels = utils.loadChannelSetChannels;
var loadChannelList = utils.loadChannelList;
var saveChannelsToSet = utils.saveChannelsToSet;
var { PageTypes, ChannelListUrls } = require('../constants');

// Requests the root nodes for the importable channels
exports.loadChannelSetChannels = function(context, payload) {
  if(context.getters.loadChannels) {
    let token = context.getters.channelSet.get('secret_token');
    if(token) {
      return loadChannelSetChannels(token.token)
      .then(function onSuccess(channels) {
        context.commit('UPDATE_CHANNELS', channels);
        context.commit('UPDATE_CHANNELS_LOADED', false);
      })
      .catch(function onError(error) {
        console.error(error);
      });
    } else {
      context.commit('UPDATE_CHANNELS', []);
      context.commit('UPDATE_CHANNELS_LOADED', false);
    }

  }
}

exports.loadChannelList = function(context, listName) {
  if(!context.getters.allChannels.hasOwnProperty(listName)) {
    return loadChannelList(ChannelListUrls[listName])
    .then(function onSuccess(channels) {
      context.commit('UPDATE_ALL_CHANNELS', {"key": listName, "value": channels});
      return channels;
    })
    .catch(function onError(error) {
      console.error(error);
    });
  }
}

exports.goToViewChannels = function(context) {
  context.commit('UPDATE_PAGE_STATE', {
    pageType: PageTypes.VIEW_CHANNELS,
    data: {},
  })
}

exports.goToSelectChannels = function(context) {
  context.commit('UPDATE_PAGE_STATE', {
    pageType: PageTypes.SELECT_CHANNELS,
    data: {},
  })
}

function contains(list, id) {
  return _.findWhere(list, {'id': id});
}

exports.addChannelToSet = function(context, channel) {
  if (!contains(context.getters.channels, channel.id)) {
    context.commit('ADD_CHANNEL_TO_SET', channel);
  }
}

// Given a ContentNode ID, removes from to-import list
exports.removeChannelFromSet = function(context, channel) {
  if (contains(context.getters.channels, channel.id)) {
    context.commit('REMOVE_CHANNEL_FROM_SET', channel);
  }
}

// Given a ContentNode ID, removes from to-import list
exports.saveChannelSet = function(context) {
  context.commit('SET_SAVING', true);
  return saveChannelsToSet(context.getters.channelSet.toJSON(), context.getters.channels)
    .then(function onSuccess(channelSet) {
      context.commit('SET_CHANNEL_SET', channelSet);
      context.commit('SET_CHANGED', false);
      context.commit('SET_SAVING', false);
    });
}
