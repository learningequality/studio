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

exports.loadChannels = function(state) {
  return state.loadChannels;
}

exports.channelSet = function(state) {
  return state.channelSet;
}

exports.allChannels = function(state) {
  return state.allChannels;
}

exports.isValid = function(state) {
  // Add validation here
  return state.stopValidation || state.name.length > 0;
}

exports.saving = function(state) {
  return state.saving;
}
