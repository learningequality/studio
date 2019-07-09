import Vue from 'vue';
import VueRouter from 'vue-router';
import Vuetify from 'vuetify';
import ChannelListIndex from './views/ChannelListIndex.vue';
import store from './store';
import router from './router';

import 'vuetify/dist/vuetify.min.css';
import 'shared/styles/main.less';

Vue.use(VueRouter);
Vue.use(Vuetify);

Vue.filter('kindIcon', function(kind) {
  switch (kind) {
    case 'topic':
      return 'folder';
    case 'video':
      return 'theaters';
    case 'audio':
      return 'headset';
    case 'image':
      return 'image';
    case 'exercise':
      return 'star';
    case 'document':
      return 'description';
    case 'html5':
      return 'widgets';
    case 'slideshow':
      return 'photo_library';
    default:
      return 'error';
  }
});

new Vue({
  el: '#channel-container',
  store,
  router,
  ...ChannelListIndex,
});
