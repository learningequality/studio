const DEFAULT_CYCLES = 25; // Temporarily using cycles to imitate polling
const POLLING_INTERVAL = 100; // TODO: Update to 5000

const progressModule = {
  actions: {
    checkProgress(context, payload) {
      // TODO: Update with real progress tracking logic
      // Test payload needs taskID and update function
      return new Promise((resolve, reject) => {
        $.ajax({
          method: 'GET',
          url: window.Urls.check_progress(payload.taskID),
          error: error => {
            payload.update({ error: 'There was an error publishing your channel' });
            reject(error);
          },
          success: data => {
            payload.cycles = payload.cycles || 0;
            if (payload.cycles < DEFAULT_CYCLES) {
              let percentage = (payload.cycles / DEFAULT_CYCLES) * 100;
              let message = 'Publishing ' + payload.cycles + '/' + DEFAULT_CYCLES;
              payload.update({ percent: percentage, message: message });
              payload.cycles++;
              setTimeout(() => {
                context.dispatch('checkProgress', payload);
              }, POLLING_INTERVAL);
            } else {
              payload.update({ percent: 100, message: 'FINISHED!' });
              resolve(data);
            }
          },
        });
      });
    },
  },
};

module.exports = progressModule;
