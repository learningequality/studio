import storeFactory from 'shared/vuex/baseStore';
import channelList from './vuex/channelList';
import channelSet from './vuex/channelSet';

const store = storeFactory({
  modules: {
    channelList,
    channelSet,
  },
});

export default store;
