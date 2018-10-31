const channelModule = {
  state: {
    contentTags: [],
    primaryModalInUse: false,
  },
  getters: {
    contentTags(state) {
      return state.contentTags;
    },
    primaryModalInUse(state) {
      return state.primaryModalInUse;
    }
  },
  mutations: {
    SET_CONTENT_TAGS(state, contentTags) {
      state.contentTags = contentTags || [];
    },
    ADD_CONTENT_TAG(state, contentTag) {
      state.contentTags.push(contentTag);
    },
    REMOVE_CONTENT_TAG_BY_NAME(state, tagName) {
      state.contentTags.splice(state.contentTags.findIndex(tag => tag.tag_name === tagName), 1);
    },
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
    }
  }
};

module.exports = channelModule;
