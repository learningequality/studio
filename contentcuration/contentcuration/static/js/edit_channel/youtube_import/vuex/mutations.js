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

exports.RESET_IMPORT_STATE = function(state) {
  Object.assign(state, {
    importStatus: ImportStatus.IDLE,
  });
}

exports.SET_YOUTUBE_DATA = function(state, payload) {
  Object.assign(state, {
    youtubeData: payload.data || null,
  });
}

exports.ADD_RESOLUTION = function(state, resolution) {
  state.resolutions.push(resolution)
}

exports.REMOVE_RESOLUTION = function(state, resolution) {
  state.resolutions = state.resolutions.filter(function(r) {
    return r.resolution !== resolution.resolution;
  });
}
