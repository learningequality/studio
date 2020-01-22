import Vue from 'vue';
import VueRouter from 'vue-router';
import Vuetify from 'vuetify';
import VueIntl from 'vue-intl';
import 'shared/i18n/setup';
import 'vuetify/dist/vuetify.min.css';
import 'shared/styles/main.less';

import ChannelEditIndex from './views/ChannelEditIndex.vue';
import store from './store';
import router from './router';
import { theme, icons } from 'shared/vuetify';

Vue.use(VueIntl);
Vue.use(VueRouter);
Vue.use(Vuetify, {
  rtl: window.isRTL,
  theme: theme(),
  icons: icons(),
});

new Vue({
  el: '#sandbox',
  store,
  router,
  ...ChannelEditIndex,
});
