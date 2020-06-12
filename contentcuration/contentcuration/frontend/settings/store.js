import settings from './vuex';
import storeFactory from 'shared/vuex/baseStore';

const store = storeFactory({
  modules: {
    settings,
  },
});

export default store;
