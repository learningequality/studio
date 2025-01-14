import storeFactory from 'shared/vuex/baseStore';
import account from './vuex';

export function factory() {
  return storeFactory({
    modules: {
      account,
    },
  });
}

const store = factory();

export default store;
