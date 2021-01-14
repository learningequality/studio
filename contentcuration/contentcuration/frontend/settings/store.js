import settings from './vuex';
import storeFactory from 'shared/vuex/baseStore';

export function factory() {
  return storeFactory({
    modules: {
      settings,
    },
  });
}

const store = factory();

export default store;
