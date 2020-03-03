import channelTable from './vuex/channelTable';
import channelInfo from './vuex/channelInfo';
import userTable from './vuex/userTable';
import userInfo from './vuex/userInfo';
import storeFactory from 'shared/vuex/baseStore';

const store = storeFactory({
  modules: {
    channelTable,
    channelInfo,
    userTable,
    userInfo,
  },
});

export default store;
