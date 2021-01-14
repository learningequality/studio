export default {
  namespaced: true,
  state: {
    contextMenuId: '',
  },
  getters: {
    currentContextMenu(state) {
      return state.contextMenuId;
    },
  },
  mutations: {
    SET_CONTEXT_MENU(state, contextMenuId) {
      state.contextMenuId = contextMenuId;
    },
  },
};
