export default {
  state: {
    isVisible: false,
    options: {
      text: '',
      // duration in ms, null indicates it should not automatically dismiss
      duration: 6000,
      actionText: '',
      actionCallback: null,
      hideCallback: null,
    },
  },
  getters: {
    snackbarIsVisible(state) {
      return state.isVisible;
    },
    snackbarOptions(state) {
      return state.options;
    },
  },
  actions: {
    showSnackbar({ commit, state }, { text, duration, actionText, actionCallback }) {
      if (state.options.hideCallback) {
        state.options.hideCallback();
      }
      return new Promise(hideCallback => {
        commit('CORE_CREATE_SNACKBAR', {
          text,
          duration,
          actionText,
          actionCallback,
          hideCallback,
        });
      });
    },
    showSnackbarSimple({ commit, state }, text) {
      if (state.options.hideCallback) {
        state.options.hideCallback();
      }
      return new Promise(hideCallback => {
        commit('CORE_CREATE_SNACKBAR', { text, hideCallback });
      });
    },
    clearSnackbar({ commit, state }) {
      if (state.options.hideCallback) {
        state.options.hideCallback();
      }
      commit('CORE_CLEAR_SNACKBAR');
    },
  },
  mutations: {
    CORE_CREATE_SNACKBAR(state, snackbarOptions = {}) {
      // reset
      state.isVisible = false;
      state.options = {};
      // set new options
      state.isVisible = true;
      // options include text, duration, actionText, actionCallback,
      // hideCallback, bottomPosition
      state.options = snackbarOptions;
    },
    CORE_CLEAR_SNACKBAR(state) {
      state.isVisible = false;
      state.options = {};
    },
    CORE_SET_SNACKBAR_TEXT(state, text) {
      state.options.text = text;
    },
  },
};
