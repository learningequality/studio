import template from './vuex/template';
import assessmentItem from './vuex/assessmentItem';
import contentNode from './vuex/contentNode';
import currentChannel from './vuex/currentChannel';
import storeFactory from 'shared/vuex/baseStore';

const store = storeFactory({
  modules: {
    template,
    assessmentItem,
    contentNode,
    currentChannel,
  },
});

export default store;
