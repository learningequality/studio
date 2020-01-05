import template from './vuex/template';
import contentNode from './vuex/contentNode';
import currentChannel from './vuex/currentChannel';
import storeFactory from 'shared/vuex/baseStore';

const store = storeFactory({
  modules: {
    template,
    contentNode,
    currentChannel,
  },
});

export default store;
