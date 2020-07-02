import channelAdmin from './vuex/channelAdmin';
import userAdmin from './vuex/userAdmin';
import storeFactory from 'shared/vuex/baseStore';

const store = storeFactory({
  modules: {
    channelAdmin,
    userAdmin,
  },
});

export default store;
