var _ = require('underscore');
var utils = require('../utils');
var getYoutubeVideoInfo = utils.getYoutubeVideoInfo;
var checkProgress = utils.checkProgress;
var { PageTypes, ImportStatus } = require('../constants');

exports.submitYoutubeURL = function(context, payload) {
  context.commit('UPDATE_IMPORT_STATUS', ImportStatus.EXTRACTING);
  return getYoutubeVideoInfo(payload.url).then(function onSuccess(data) {
    var task_id = JSON.parse(data).task_id;
    checkProgress(task_id).then(function(data) {
      context.commit('UPDATE_IMPORT_STATUS', ImportStatus.IDLE);
      context.commit('SET_YOUTUBE_DATA', {'data': data});
      payload.onSuccess();
    })
  }).catch(function onFailure(error) {
    console.error(error);
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

exports.goToSubmitURL = function(context) {
  context.commit('UPDATE_PAGE_STATE', {
    pageType: PageTypes.SUBMIT_URL,
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
