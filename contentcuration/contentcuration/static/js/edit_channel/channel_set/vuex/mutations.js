var { PageTypes } = require('../constants');

exports.UPDATE_CHANNELS_ARE_LOADING = function(state, isLoading) {
  state.channelsAreLoading = isLoading
}

exports.UPDATE_CHANNELS = function(state, channels) {
  state.channels = channels;
}

exports.RESET_PAGE_STATE = function(state) {
  Object.assign(state, {
    channelsAreLoading: false,
    name: "",
    description: "",
    channels: [],
    original_channels: [],
    changed: false,
    channel_set: null,
    isNewSet: false,
    pageState: {
      pageType: PageTypes.VIEW_CHANNELS,
      data: {},
    }
  });
}

exports.SET_CHANNEL_SET = function(state, channel_set) {
  state.name = channel_set.get('name');
  state.description = channel_set.get('description');
  state.channel_set = channel_set;
}


exports.SET_IS_NEW = function(state, isNew) {
  state.isNewSet = isNew;
}

exports.SET_NAME = function(state, name) {
  state.name = name;
  state.changed = name !== state.channel_set.get('name');
}

exports.SET_DESCRIPTION = function(state, description) {
  state.description = description;
  state.changed = description !== state.channel_set.get('description');
}






// exports.ADD_ITEM_TO_IMPORT_LIST = function(state, contentNode) {
//   state.itemsToImport.push(contentNode)
// }

// exports.REMOVE_ITEM_FROM_IMPORT_LIST = function(state, contentNodeId) {
//   state.itemsToImport = state.itemsToImport.filter(function(node) {
//     return node.id !== contentNodeId;
//   });
// }

// exports.UPDATE_IMPORT_SIZE = function(state, newSize) {
//   state.importSizeInBytes = newSize;
// }


// exports.UPDATE_IMPORT_STATUS = function(state, status) {
//   state.importStatus = status;
// }

// exports.UPDATE_PAGE_STATE = function(state, payload) {
//   state.pageState = {
//     pageType: payload.pageType,
//     data: payload.data || {},
//   };
// }
