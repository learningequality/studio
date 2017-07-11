exports.ADD_ITEM_TO_IMPORT_LIST = function(state, contentNode) {
  state.itemsToImport.push(contentNode)
}

exports.REMOVE_ITEM_FROM_IMPORT_LIST = function(state, contentNodeId) {
  state.itemsToImport = state.itemsToImport.filter(function(node) {
    return node.id !== contentNodeId;
  });
}

exports.UPDATE_IMPORT_SIZE = function(state, newSize) {
  state.importSizeInBytes = newSize;
}

exports.UPDATE_CHANNELS = function(state, channels) {
  state.channels = channels;
}

exports.UPDATE_IMPORT_STATUS = function(state, status) {
  state.importStatus = status;
}

exports.UPDATE_PAGE_STATE = function(state, payload) {
  state.pageState = {
    pageType: payload.pageType,
    data: payload.data || {},
  };
}

exports.RESET_IMPORT_STATE = function(state) {
  Object.assign(state, {
    itemsToImport: [],
    importStatus: null,
    importSizeInBytes: 0,
  });
}

exports.UPDATE_CHANNELS_ARE_LOADING = function(state, isLoading) {
  state.channelsAreLoading = isLoading
}
