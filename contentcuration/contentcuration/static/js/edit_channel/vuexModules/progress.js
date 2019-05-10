const progressModule = {
  state: {
    progressPercent: 0.0,
  },
  getters: {
    progressPercent(state) {
      return state.progressPercent;
    },
  },
  mutations: {
    SET_PROGRESS(state, percent) {
      state.progressPercent = Math.min(100, percent);
    },
  },
};

module.exports = progressModule;
