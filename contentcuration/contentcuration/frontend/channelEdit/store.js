import template from './vuex/template';
import storeFactory from 'shared/vuex/baseStore';

const store = storeFactory({
  modules: {
    template,
  },
});

export default store;
