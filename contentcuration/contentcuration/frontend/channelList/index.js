import Vue from 'vue';
import VueRouter from 'vue-router';
import Vuetify from 'vuetify';
import ChannelListIndex from './views/ChannelListIndex.vue';
import store from './store';
import router from './router';

import 'shared/i18n/setup';

import 'vuetify/dist/vuetify.min.css';
import 'shared/styles/main.less';

Vue.use(VueRouter);
Vue.use(Vuetify);

new Vue({
  el: '#channel-container',
  store,
  router,
  ...ChannelListIndex,
});
