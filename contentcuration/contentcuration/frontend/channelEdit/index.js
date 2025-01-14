import startApp from 'shared/app';
import ChannelEditIndex from './views/ChannelEditIndex.vue';
import store from './store';
import router from './router';

startApp({
  store,
  router,
  index: ChannelEditIndex,
});
