import Vue from 'vue';
import VueRouter from 'vue-router';
import Vuetify from 'vuetify';
import VueIntl from 'vue-intl';

import ChannelListIndex from './views/ChannelListIndex.vue';
import store from './store';
import router from './router';

import 'shared/i18n/setup';
import { theme, icons } from 'shared/vuetify';

import 'vuetify/dist/vuetify.min.css';
import 'shared/styles/main.less';

Vue.use(VueIntl);
Vue.use(VueRouter);
Vue.use(Vuetify, {
  rtl: window.isRTL,
  theme: theme(),
  icons: icons(),
});

new Vue({
  el: '#channel-container',
  store,
  router,
  ...ChannelListIndex,
});
