import Vue from 'vue';
import VueRouter from 'vue-router';
import Vuetify from 'vuetify';
import colors from 'vuetify/es5/util/colors';
import ChannelListIndex from './views/ChannelListIndex.vue';
import store from './store';
import router from './router';

import 'shared/i18n/setup';

import 'vuetify/dist/vuetify.min.css';
import 'shared/styles/main.less';

Vue.use(VueRouter);
Vue.use(Vuetify, {
  rtl: window.isRTL,
  theme: {
    primary: colors.blue.base,
    purple: '#996189',
  },
});

new Vue({
  el: '#channel-container',
  store,
  router,
  ...ChannelListIndex,
});
