export default {
  state: {
    isVisible: false,
    options: {
      text: '',
      // duration in ms, null indicates it should not automatically dismiss
      duration: 6000,
      actionText: '',
      actionCallback: null,
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
    showSnackbar({ commit }, { text, duration, actionText, actionCallback }) {
      commit('CORE_CREATE_SNACKBAR', { text, duration, actionText, actionCallback });
    },
    showSnackbarSimple({ commit }, text) {
      commit('CORE_CREATE_SNACKBAR', { text });
    },
    clearSnackbar({ commit }) {
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
