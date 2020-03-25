import session from 'shared/vuex/session';
import storeFactory from 'shared/vuex/baseStore';

const store = storeFactory({
  modules: {
    session,
  },
});

export default store;
