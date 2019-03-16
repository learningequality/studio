const ERROR_PRIMARY_MODAL_ALREADY_OPEN = modalName =>
  `The primary modal is in use by: ${modalName} modal.`;

const primaryModalModule = {
  state: {
    primaryModalInUse: null,
  },
  getters: {
    primaryModalInUse(state) {
      return state.primaryModalInUse;
    },
  },
  mutations: {
    OPEN_PRIMARY_MODAL: (state, payload) => {
      state.primaryModalInUse = payload;
    },
    CLOSE_PRIMARY_MODAL: state => {
      state.primaryModalInUse = null;
    },
  },
  actions: {
    usePrimaryModal({ state, commit }, buildModalView) {
      return new Promise(resolve => {
        if (!state.primaryModalInUse) {
          let modalView = buildModalView();
          commit('OPEN_PRIMARY_MODAL', modalView);
          modalView.listenTo(modalView, 'removed', () => commit('CLOSE_PRIMARY_MODAL'));
          resolve(modalView);
        } else {
          throw new Error(ERROR_PRIMARY_MODAL_ALREADY_OPEN(state.primaryModalInUse.name));
        }
      });
    },
  },
};

module.exports = {
  ...primaryModalModule,
  ERROR_PRIMARY_MODAL_ALREADY_OPEN,
};
