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
  actions: {
    // Although `syncProgressPlugin` detects that there
    // are unsaved changes after updates are committed
    // to IndexedDB and saves this information to `state.unsavedChanges`,
    // there might be delay before a change is propagated
    // to IndexedDB in some scenarios (e.g. debounced auto-save
    // of diff tracker in details tab of edit modal)
    // It is advised to use this action to update `state.unsavedChanges`
    // to `false` whenever needed to prevent users from leaving
    // the app with unsaved changes if they attempt to leave
    // very fast after submitting updates
    setUnsavedChanges(context, unsavedChanges) {
      context.commit('SET_UNSAVED_CHANGES', unsavedChanges);
    },
  },
};
