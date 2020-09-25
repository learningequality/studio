import channelAdmin from './vuex/channelAdmin';
import userAdmin from './vuex/userAdmin';
import storeFactory from 'shared/vuex/baseStore';

const store = storeFactory({
  modules: {
    channelAdmin,
    userAdmin,
  },
  getters: {
    currentUserIsAdmin(state, getters, rootState) {
      return rootState.session.currentUser.is_admin;
    },
  },
});

export default store;
