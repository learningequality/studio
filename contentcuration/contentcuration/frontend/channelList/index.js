import startApp from 'shared/app';
import ChannelListIndex from './views/ChannelListIndex.vue';
import store from './store';
import router from './router';

startApp({
  store,
  router,
  index: ChannelListIndex,
});
