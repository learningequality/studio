import channelAdmin from './vuex/channelAdmin';
import storeFactory from 'shared/vuex/baseStore';

const store = storeFactory({
  modules: {
    channelAdmin,
  },
});

export default store;
