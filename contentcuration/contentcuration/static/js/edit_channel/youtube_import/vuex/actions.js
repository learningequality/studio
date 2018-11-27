var _ = require('underscore');
var utils = require('../utils');
var getYoutubeVideoInfo = utils.getYoutubeVideoInfo;
var downloadYoutubeVideosFromURL = utils.downloadYoutubeVideosFromURL;
var checkProgress = utils.checkProgress;
var Models = require("../../models");
var { PageTypes, ImportStatus } = require('../constants');

exports.submitYoutubeURL = function(context, payload) {
  context.commit('UPDATE_IMPORT_STATUS', ImportStatus.EXTRACTING);
  context.commit('SET_YOUTUBE_URL', payload.url);
  return getYoutubeVideoInfo(payload.url).then(function onSuccess(data) {
    var task_id = JSON.parse(data).task_id;
    checkProgress(task_id).then(function(data) {
      context.commit('UPDATE_IMPORT_STATUS', ImportStatus.IDLE);
      context.commit('SET_YOUTUBE_DATA', data);
      payload.onSuccess();
    });
  }).catch(function onFailure(error) {
    console.error(error);
    context.commit('SET_YOUTUBE_URL', null);
    context.commit('UPDATE_IMPORT_STATUS', ImportStatus.EXTRACT_ERROR);
  });
}

exports.goToConfirm = function(context) {
  context.commit('UPDATE_PAGE_STATE', {
    pageType: PageTypes.CONFIRM,
    data: {
      previousState: {
        pageType: context.state.pageState.pageType,
        youtubeUrl: context.state.pageState.data.youtubeUrl,
      },
    },
  });
}

exports.addResolution = function(context, resolution) {
  context.commit('ADD_RESOLUTION', resolution);
}

exports.removeResolution = function(context, resolution) {
  context.commit('REMOVE_RESOLUTION', resolution);
}

exports.downloadYoutubeVideos = function(context, payload) {
  context.commit('UPDATE_IMPORT_STATUS', ImportStatus.DOWNLOADING);
  return downloadYoutubeVideosFromURL(payload.url, payload.resolutions, payload.parent_id)
  .then(function onSuccess(data) {
    context.commit('SET_NODES_TO_IMPORT', data);
    context.commit('UPDATE_IMPORT_STATUS', ImportStatus.START_IMPORT);
  }).catch(function onFailure(error) {
    console.error(error);
    context.commit('UPDATE_IMPORT_STATUS', ImportStatus.DOWNLOAD_ERROR);
  });
}

exports.addNodes = function(context, payload) {
  var collection = new Models.ContentNodeCollection(context.state.importNodes);
  payload.onConfirmImport(collection);
  context.commit('UPDATE_IMPORT_STATUS', ImportStatus.DONE);
}
