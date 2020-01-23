import Vue from 'vue';
import VueRouter from 'vue-router';
import Vuetify from 'vuetify';
import VueIntl from 'vue-intl';
import colors from 'vuetify/es5/util/colors';
import 'shared/i18n/setup';
import 'vuetify/dist/vuetify.min.css';
import 'shared/styles/main.less';

import ChannelEditIndex from './views/ChannelEditIndex.vue';
import store from './store';
import router from './router';
import client from './client';

import registerConnectionChecker from 'shared/vuex/connectionCheckerPlugin';

registerConnectionChecker(client, store);

Vue.use(VueIntl);
Vue.use(VueRouter);
Vue.use(Vuetify, {
  rtl: window.isRTL,
  theme: {
    purple: '#996189',
    primary: '#996189', //colors.blue.base, // @blue-500
    secondary: '#8DC5B6',
    primaryBackground: colors.blue.lighten5,
    greyBackground: colors.grey.lighten3,
    greenSuccess: '#4db6ac',
    topic: colors.grey.base,
    video: '#283593',
    audio: '#f06292',
    document: '#ff3d00',
    exercise: '#4db6ac',
    html5: '#ff8f00',
    slideshow: '#4ece90',
  },
});

new Vue({
  el: '#sandbox',
  store,
  router,
  ...ChannelEditIndex,
});
