// var _ = require('underscore');
var Models = require('edit_channel/models');

export function loadNodes(context, nodeIDs) {
  return new Models.ContentNodeCollection().get_all_fetch_simplified(nodeIDs).then(collection => {
    context.commit('ADD_NODES', collection.toJSON());
  });
}

export function publishChannel() {
  // console.log(context.getters.channel)
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
