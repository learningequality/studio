import ChannelListIndex from './views/ChannelListIndex.vue';
import store from './store';
import router from './router';
import startApp from 'shared/app';

startApp({
  store,
  router,
  index: ChannelListIndex,
});
