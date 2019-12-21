import channelList from './vuex/channelList';
import channelSet from './vuex/channelSet';
import storeFactory from 'shared/vuex/baseStore';

const store = storeFactory({
  modules: {
    channelList,
    channelSet,
  },
});

export default store;
