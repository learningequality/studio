import account from './vuex';
import storeFactory from 'shared/vuex/baseStore';

export function factory() {
  return storeFactory({
    modules: {
      account,
    },
  });
}

const store = factory();

export default store;
