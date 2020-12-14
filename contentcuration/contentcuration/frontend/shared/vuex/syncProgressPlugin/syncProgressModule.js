export default {
  state: {
    unsavedChanges: false,
  },
  mutations: {
    SET_UNSAVED_CHANGES(state, unsavedChanges) {
      state.unsavedChanges = unsavedChanges;
    },
  },
  getters: {
    areAllChangesSaved(state) {
      return !state.unsavedChanges;
    },
  },
};
