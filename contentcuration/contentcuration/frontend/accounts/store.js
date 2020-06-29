import account from './vuex';
import storeFactory from 'shared/vuex/baseStore';

const store = storeFactory({
  modules: {
    account,
  },
});

export default store;
