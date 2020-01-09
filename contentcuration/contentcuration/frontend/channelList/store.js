import channelList from './vuex/channelList';
import channelSet from './vuex/channelSet';
import storeFactory from 'shared/vuex/baseStore';
import { Channel } from 'shared/data';

const store = storeFactory({
  modules: {
    channelList,
    channelSet,
  },
});

Channel.onCreate(obj => {
  store.commit('channel/ADD_CHANNEL', obj);
});

Channel.onUpdate(obj => {
  store.commit('channel/UPDATE_CHANNEL', obj);
});

Channel.onDelete(obj => {
  store.commit('channel/DELETE_CHANNEL', obj);
});

export default store;
