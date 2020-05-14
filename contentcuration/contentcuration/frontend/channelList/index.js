import ChannelListIndex from './views/ChannelListIndex.vue';
import store from './store';
import router from './router';
import startApp from 'shared/app';
import { generatePdf } from 'shared/utils';

window.generatePdf = generatePdf;

startApp({
  store,
  router,
  index: ChannelListIndex,
});
