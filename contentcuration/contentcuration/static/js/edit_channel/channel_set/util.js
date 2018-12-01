var Models = require('../models');
const State = require("edit_channel/state");

exports.loadChannelSetChannels = function(token) {
  return new Promise(function(resolve, reject) {
    $.ajax({
      method:"GET",
      url: window.Urls.get_channels_by_token(token),
      success: resolve,
      error: reject
    });
  })
}

exports.loadChannelList = function(url) {
  return new Promise(function(resolve, reject) {
    $.ajax({
      method:"GET",
      url: url,
      success: resolve,
      error: reject
    });
  })
}

exports.saveChannelsToSet = function(channelSetData, channels) {
  return new Promise(function(resolve, reject) {
    let channelSetModel = new Models.ChannelSetModel();
    delete channelSetData.secret_token; // Don't save this

    if(!channelSetData.editors || channelSetData.editors.length === 0) {
      channelSetData.editors = [State.current_user.id];
    }

    channelSetModel.save(channelSetData, {
      patch: true,
      error: reject,
      success: function(channelSet) {
        console.log(channelSet)
        $.ajax({
          method:"POST",
          url: window.Urls.save_token_to_channels(channelSet.get('secret_token').token),
          success: function() {
            resolve(channelSet);
          },
          error: reject,
          data: JSON.stringify(_.pluck(channels, 'id'))
        });
      }
    })

  })
}
