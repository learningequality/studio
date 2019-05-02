import { Statuses } from 'edit_channel/constants/index';

const POLLING_INTERVAL = 5000;

const progressModule = {
  actions: {
    checkProgress(context, payload) {
      // TODO: Update with real progress tracking logic
      // Test payload needs taskID and update function
      return new Promise((resolve, reject) => {
        $.ajax({
          method: 'GET',
          url: window.Urls.tasks(payload.taskID),
          error: error => {
            payload.update({ error: 'There was an error publishing your channel' });
            reject(error);
          },
          success: data => {
            data = JSON.parse(data);
            payload.update(data);
            if (data.status === Statuses.SUCCESS) {
              resolve(data);
            } else {
              setTimeout(() => {
                context.dispatch('checkProgress', payload);
              }, POLLING_INTERVAL);
            }
          },
        });
      });
    },
    cancelTask(context, payload) {
      // TODO: Update with real progress tracking logic
      // Test payload needs taskID and update function
      return new Promise((resolve, reject) => {
        $.ajax({
          method: 'DELETE',
          url: window.Urls.tasks(payload.taskID),
          error: reject,
          success: data => {
            resolve(data);
          },
        });
      });
    },
  },
};

module.exports = progressModule;
