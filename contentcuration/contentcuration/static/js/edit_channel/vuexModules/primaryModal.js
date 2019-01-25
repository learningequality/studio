const ERROR_PRIMARY_MODAL_ALREADY_OPEN = 'The primary modal is already open.'

const primaryModalModule = {
    state: {
      primaryModalInUse: false,
    },
    getters: {
      primaryModalInUse(state) {
        return state.primaryModalInUse;
      },
    },
    mutations: {
      OPEN_PRIMARY_MODAL: (state) => { state.primaryModalInUse = true },
      CLOSE_PRIMARY_MODAL: (state) => { state.primaryModalInUse = false },
    },
    actions: {
      usePrimaryModal({state, commit}, buildModalView){
        return new Promise((resolve, reject) => {
          if (!state.primaryModalInUse) {
            let modalView = buildModalView()
            commit('OPEN_PRIMARY_MODAL')
            modalView.listenTo(modalView, 'removed', () => commit('CLOSE_PRIMARY_MODAL'))
            resolve(modalView)
          } else {
            throw new Error(ERROR_PRIMARY_MODAL_ALREADY_OPEN)
          }
        })
      },
    },
  };
  
  module.exports = {
    ...primaryModalModule,
    ERROR_PRIMARY_MODAL_ALREADY_OPEN
  };
  