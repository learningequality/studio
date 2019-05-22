var _ = require('underscore');
var utils = require('../util');

var saveChannelsToSet = utils.saveChannelsToSet;
var { PageTypes, ChannelListUrls } = require('../constants');

export function loadChannelSetChannels(context) {
  if (context.getters.loadChannels) {
    let token = context.getters.channelSet.get('secret_token');
    if (token) {
      return utils
        .loadChannelSetChannels(token.token)
        .then(function onSuccess(channels) {
          context.commit('UPDATE_CHANNELS', channels);
          context.commit('UPDATE_CHANNELS_LOADED', false);
        })
        .catch(function onError(error) {
          // eslint-disable-next-line no-console
          console.error(error);
        });
    } else {
      context.commit('UPDATE_CHANNELS', []);
      context.commit('UPDATE_CHANNELS_LOADED', false);
    }
  }
}

export function loadChannelList(context, listName) {
  if (!context.getters.allChannels.hasOwnProperty(listName)) {
    return utils
      .loadChannelList(ChannelListUrls[listName])
      .then(function onSuccess(channels) {
        context.commit('UPDATE_ALL_CHANNELS', { key: listName, value: channels });
        return channels;
      })
      .catch(function onError(error) {
        // eslint-disable-next-line no-console
        console.error(error);
      });
  }
}

export function goToViewChannels(context) {
  context.commit('UPDATE_PAGE_STATE', {
    pageType: PageTypes.VIEW_CHANNELS,
    data: {},
  });
}

export function goToSelectChannels(context) {
  context.commit('UPDATE_PAGE_STATE', {
    pageType: PageTypes.SELECT_CHANNELS,
    data: {},
  });
}

function contains(list, id) {
  return _.findWhere(list, { id: id });
}

export function addChannelToSet(context, channel) {
  if (!contains(context.getters.channels, channel.id)) {
    context.commit('ADD_CHANNEL_TO_SET', channel);
  }
}

export function removeChannelFromSet(context, channel) {
  if (contains(context.getters.channels, channel.id)) {
    context.commit('REMOVE_CHANNEL_FROM_SET', channel);
  }
}

export function saveChannelSet(context, callback) {
  context.commit('PREPARE_CHANNEL_SET_FOR_SAVE');
  if (!context.getters.isValid) {
    context.commit('SET_SAVING', false);
    context.commit('UPDATE_PAGE_STATE', {
      pageType: PageTypes.VIEW_CHANNELS,
      data: {},
    });
  } else {
    return saveChannelsToSet(context.getters.channelSet.toJSON(), context.getters.channels)
      .then(function onSuccess(channelSet) {
        context.commit('SET_CHANNEL_SET', channelSet);
        context.commit('SET_CHANGED', false);
        context.commit('SET_SAVING', false);
        callback(channelSet);
      })
      .catch(function(error) {
        // eslint-disable-next-line no-console
        console.error(error);
        context.commit('SET_SAVING', false);
        context.commit('SET_ERROR', true);
      });
  }
}
