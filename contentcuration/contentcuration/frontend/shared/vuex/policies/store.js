import policies from './vuex';
import storeFactory from 'shared/vuex/baseStore';

const store = storeFactory({
  modules: {
    policies,
  },
});

export default store;
