var _ = require('underscore');

exports.isNewSet = function(state) {
  return state.isNewSet;
}

exports.currentPage = function(state) {
  return state.pageState.pageType;
}

exports.channels = function(state) {
  return state.channels;
}

exports.changed = function(state) {
  return state.changed;
}

exports.name = function(state) {
  return state.name;
}

exports.description = function(state) {
  return state.description;
}
