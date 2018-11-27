var Models = require('../models');

exports.getYoutubeVideoInfo = function(youtubeUrl) {
  return new Promise(function(resolve, reject) {
    $.ajax({
      method:"GET",
      url: window.Urls.retrieve_youtube_info(),
      success: resolve,
      error: reject,
      data: {
        q: youtubeUrl,
      }
    });
  });
}

exports.checkProgress = function(task_id, cycles) {
  return new Promise(function(resolve, reject) {
    _checkTask(task_id, resolve, reject);
  });
}

function _checkTask(task_id, successCallback, errorCallback, cycles) {
  cycles = cycles || 5;
  $.ajax({
    method:"GET",
    url: window.Urls.check_progress(task_id),
    success: function(data) {
      // Temporarily using cycles to imitate polling
      if (cycles - 1 > 0) {
        console.log("Polling...");
        _checkTask(task_id, successCallback, errorCallback, cycles - 1);
      } else {
        console.log("FINISHED!");
        successCallback(JSON.parse(data));
      }
    },
    error: errorCallback
  });
}
