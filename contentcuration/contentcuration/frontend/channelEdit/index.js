import ChannelEditIndex from './views/ChannelEditIndex.vue';
import store from './store';
import router from './router';
import startApp from 'shared/app';

startApp({
  store,
  router,
  index: ChannelEditIndex,
});
