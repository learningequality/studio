let Models = require('edit_channel/models');

export function publishChannel(context) {
  return new Promise((resolve, reject) => {
    let data = { channel_id: context.state.channel.id };
    $.ajax({
      method: 'POST',
      url: window.Urls.publish_channel(),
      data: JSON.stringify(data),
      error: reject,
      success: taskID => {
        // TODO: update with task logic
        taskID = context.state.channel.id;
        context.commit('SET_TASK', taskID);
        resolve(true);
      },
    });
  });
}

export function setChannelLanguage(context, languageID) {
  let payload = {
    language: languageID,
  };
  return new Promise((resolve, reject) => {
    new Models.ChannelModel(context.state.channel).save(payload, {
      patch: true,
      error: reject,
      success: () => {
        context.commit('SET_CHANNEL_LANGUAGE', languageID);
        resolve();
      },
    });
  });
}

export function loadChannelSize(context) {
  let mainTreeID = context.state.channel.main_tree.id;
  return new Promise((resolve, reject) => {
    $.ajax({
      method: 'GET',
      url: window.Urls.get_total_size(mainTreeID),
      error: reject,
      success: function(data) {
        resolve(JSON.parse(data).size);
      },
    });
  });
}
