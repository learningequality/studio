import template from './vuex/template';
import contentNode from './vuex/contentNode';
import storeFactory from 'shared/vuex/baseStore';

const store = storeFactory({
  modules: {
    template,
    contentNode,
  },
});

export default store;
