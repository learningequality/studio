import channelList from './vuex/channelList';
import channelSet from './vuex/channelSet';
import catalog from './vuex/catalog';
import storeFactory from 'shared/vuex/baseStore';

const store = storeFactory({
  modules: {
    channelList,
    channelSet,
    catalog,
  },
});

export default store;
