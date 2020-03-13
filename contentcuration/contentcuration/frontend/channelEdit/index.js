import ChannelEditIndex from './views/ChannelEditIndex.vue';
import store from './store';
import router from './router';
import startApp from 'shared/app';

startApp({
  store,
  router,
  index: ChannelEditIndex,
});

// // TODO: Remove block once integrated into tree
// window.preferences = {
//   license: 'Public Domain',
//   copyright_holder: 'Default Copyright Holder',
// };
// State.currentNode = {
//   id: window.root_id,
//   title: 'Sandbox Topic',
//   metadata: {
//     max_sort_order: 0,
//   },
// };
// // End remove block
