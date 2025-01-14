import storeFactory from 'shared/vuex/baseStore';
import settings from './vuex';

export function factory() {
  return storeFactory({
    modules: {
      settings,
    },
  });
}

const store = factory();

export default store;
