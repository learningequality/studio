var { PageTypes, ImportStatus } = require('../constants');

exports.UPDATE_IMPORT_STATUS = function(state, status) {
  state.importStatus = status;
}

exports.UPDATE_PAGE_STATE = function(state, payload) {
  state.pageState = {
    pageType: payload.pageType,
    data: payload.data || {},
  };
}

exports.RESET_STORE = function(state) {
  Object.assign(state, {
    youtubeData: null,
    youtubeURL: "",
    resolutions: [],
    importStatus: ImportStatus.IDLE,
    importNodes: null,
    parentID: null,
    pageState: {
      pageType: PageTypes.SUBMIT_URL,
      data: {},
    }
  });
}

exports.SET_YOUTUBE_DATA = function(state, data) {
	state.youtubeData = data || null;
}

exports.SET_YOUTUBE_URL = function(state, url) {
  state.youtubeURL = url || "";
}

exports.SET_NODES_TO_IMPORT = function(state, nodeCollection) {
  state.importNodes = nodeCollection || null;
}

exports.ADD_RESOLUTION = function(state, resolution) {
  state.resolutions.push(resolution);
}

exports.REMOVE_RESOLUTION = function(state, resolution) {
  state.resolutions = state.resolutions.filter(function(r) {
    return r.resolution !== resolution.resolution;
  });
}

exports.SET_PARENT_ID = function(state, parent_id) {
  state.parentID = parent_id || null;
}
