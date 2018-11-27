var _ = require('underscore');
const State = require("edit_channel/state");

// Name of the current ImportModal page
exports.currentPage = function(state) {
  return state.pageState.pageType;
}

// Error on last download
exports.currentStatus = function(state) {
  return state.importStatus;
}

// Error on last download
exports.youtubeData = function(state) {
  return state.youtubeData;
}

// Error on last download
exports.downloadSize = function(state) {
  var sizes = (state.resolutions)? _.pluck(state.resolutions, 'size') : [];
  return _.reduce(sizes, function(sum, size) { return sum + size; }, 0);
}
