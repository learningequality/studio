const dialogModule = {
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
            reject('The primary modal is already open.')
          }
        })
      },
    },
  };
  
  module.exports = dialogModule;
  