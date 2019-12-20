import Vue from 'vue';
import VueRouter from 'vue-router';
import Vuetify from 'vuetify';
import VueIntl from 'vue-intl';

import colors from 'vuetify/es5/util/colors';
import ChannelListIndex from './views/ChannelListIndex.vue';
import store from './store';
import router from './router';

import 'shared/i18n/setup';

import 'vuetify/dist/vuetify.min.css';
import 'shared/styles/main.less';

Vue.use(VueIntl);
Vue.use(VueRouter);
Vue.use(Vuetify, {
  rtl: window.isRTL,
  theme: {
    purple: '#996189',
    primary: '#996189', //colors.blue.base, // @blue-500
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
  el: '#channel-container',
  store,
  router,
  ...ChannelListIndex,
});
