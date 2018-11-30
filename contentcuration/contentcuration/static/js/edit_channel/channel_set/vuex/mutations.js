var { PageTypes } = require('../constants');

exports.UPDATE_CHANNELS_LOADED = function(state, isLoading) {
  state.loadChannels = isLoading;
}

exports.UPDATE_LOADED_CHANNEL_LISTS = function(state, channelListName) {
  state.loadedChannelLists.push(channelListName);
}

exports.UPDATE_CHANNELS = function(state, channels) {
  state.channels = channels;
}

exports.UPDATE_ALL_CHANNELS = function(state, data) {
  state.allChannels[data.key] = data.value;
}

exports.UPDATE_ORIGINAL_CHANNELS = function(state, channels) {
  state.originalChannels = channels;
}

exports.UPDATE_PAGE_STATE = function(state, payload) {
  state.pageState = {
    pageType: payload.pageType,
    data: payload.data || {},
  };
}

exports.RESET_PAGE_STATE = function(state) {
  Object.assign(state, {
    loadChannels: true,
    name: "",
    description: "",
    channels: [],
    originalChannels: [],
    allChannels: {},
    changed: false,
    channelSet: null,
    isNewSet: false,
    pageState: {
      pageType: PageTypes.VIEW_CHANNELS,
      data: {},
    }
  });
}

exports.SET_CHANNEL_SET = function(state, channelSet) {
  state.name = channelSet.get('name');
  state.description = channelSet.get('description');
  state.channelSet = channelSet;
}


exports.SET_IS_NEW = function(state, isNew) {
  state.isNewSet = isNew;
}

exports.SET_NAME = function(state, name) {
  state.name = name;
  state.changed = name !== state.channelSet.get('name');
}

exports.SET_DESCRIPTION = function(state, description) {
  state.description = description;
  state.changed = description !== state.channelSet.get('description');
}

exports.ADD_CHANNEL_TO_SET = function(state, channel) {
  state.channels.push(channel);
  state.changed = true;
}

exports.REMOVE_CHANNEL_FROM_SET = function(state, channel) {
  state.channels = state.channels.filter(function(c) {
    return c.id !== channel.id;
  });
  state.changed = true;
}

// exports.REMOVE_ITEM_FROM_IMPORT_LIST = function(state, contentNodeId) {
//
// }

// exports.UPDATE_IMPORT_SIZE = function(state, newSize) {
//   state.importSizeInBytes = newSize;
// }


// exports.UPDATE_IMPORT_STATUS = function(state, status) {
//   state.importStatus = status;
// }
