import channelList from './vuex/channelList';
import channelSet from './vuex/channelSet';
import storeFactory from 'shared/vuex/baseStore';

export function factory() {
  return storeFactory({
    modules: {
      channelList,
      channelSet,
    },
  });
}

const store = factory();

export default store;
