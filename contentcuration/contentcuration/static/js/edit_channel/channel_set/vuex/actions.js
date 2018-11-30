var _ = require('underscore');
var utils = require('../util');
var loadChannelSetChannels = utils.loadChannelSetChannels;
var loadChannelList = utils.loadChannelList;
var { PageTypes, ChannelListUrls } = require('../constants');

// Requests the root nodes for the importable channels
exports.loadChannelSetChannels = function(context, payload) {
  if(context.getters.loadChannels) {
    let token = context.getters.channelSet.get('secret_token').token;
    return loadChannelSetChannels(token)
      .then(function onSuccess(channels) {
        context.commit('UPDATE_ORIGINAL_CHANNELS', _.clone(channels));
        context.commit('UPDATE_CHANNELS', channels);
        context.commit('UPDATE_CHANNELS_LOADED', false);
      })
      .catch(function onError(error) {

      });
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


// // Takes the to-import list and copies/duplicates them over to the current channel
// exports.copyImportListToChannel = function(context, payload) {
//   context.commit('UPDATE_IMPORT_STATUS', 'start');
//   var importCollection = createContentNodeCollection(context.state.itemsToImport);
//   return importCollection
//   .duplicate(payload.baseViewModel)
//   .then(function onSuccess(collection) {
//     context.commit('UPDATE_IMPORT_STATUS', 'success');
//     payload.onConfirmImport(collection);
//   })
//   .catch(function onFailure(error) {
//     console.error(error);
//     context.commit('UPDATE_IMPORT_STATUS', 'failure');
//   });
// }
