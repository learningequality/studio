let Models = require('edit_channel/models');

const publishModule = {
  namespaced: true,
  state: {
    channel: null,
  },
  mutations: {
    SET_CHANNEL(state, channel) {
      state.channel = channel;
    },
    SET_CHANNEL_LANGUAGE(state, languageID) {
      state.channel.language = languageID;
    },
  },
  actions: {
    publishChannel(context) {
      return new Promise((resolve, reject) => {
        let data = { channel_id: context.state.channel.id };
        $.ajax({
          method: 'POST',
          url: window.Urls.publish_channel(),
          data: JSON.stringify(data),
          dataType: 'json',
          error: reject,
          success: task => {
            let mypayload = { task: task, resolveCallback: resolve, rejectCallback: reject };
            // FIXME: Find a way to force a task list update, as we do when we call startTask
            context.commit('SET_CURRENT_TASK', mypayload, { root: true });
          },
        });
      });
    },

    setChannelLanguage(context, languageID) {
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
    },

    loadChannelSize(context) {
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
    },
  },
};

module.exports = publishModule;
