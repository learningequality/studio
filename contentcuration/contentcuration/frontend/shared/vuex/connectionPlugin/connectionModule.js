import axios from 'axios';

export default {
  state: () => ({
    online: true && navigator.onLine,
    timeLastWentOffline: null,
    timeLastCameOnline: null,
    polling: false,
  }),
  mutations: {
    SET_ONLINE_STATUS(state, online) {
      if (state.online != online) {
        // the state has changed
        state.timeLastWentOffline = !online ? new Date() : null;
        state.timeLastCameOnline = online ? new Date() : null;
        state.online = online;
      }
    },
    START_POLLING(state) {
      state.polling = true;
    },
    STOP_POLLING(state) {
      state.polling = false;
    },
  },
  actions: {
    handleDisconnection({ commit, dispatch }) {
      commit('SET_ONLINE_STATUS', false);
      dispatch('checkConnection');
    },
    handleReconnection({ commit, state }) {
      if (!state.online) commit('SET_ONLINE_STATUS', true);
      if (state.polling) commit('STOP_POLLING');
    },
    checkConnection({ state, commit, dispatch }) {
      if (state.polling) return; // polling has already been initiated

      // used https://github.com/Aupajo/backoff-calculator to tune this
      const maximumPollingDelay = 30 * 60; // 30 minutes
      const initialPollingDelay = 1; // 1 second
      const delaySeconds = i => Math.min(i ** 2 + initialPollingDelay, maximumPollingDelay);

      const stealth = window.Urls.stealth();
      const pollingClient = axios.create();

      let attempt = 0;
      pollingClient.interceptors.request.use(request => {
        attempt++;
        return request;
      });

      pollingClient.interceptors.response.use(
        () => dispatch('handleReconnection'),
        error => {
          if (state.polling) {
            setTimeout(() => pollingClient.get(stealth), 1000 * delaySeconds(attempt));
          }
          return Promise.reject(error);
        },
      );

      pollingClient.get(stealth);
      commit('START_POLLING');
    },
  },
};
