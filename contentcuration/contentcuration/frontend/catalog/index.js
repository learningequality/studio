import Vue from 'vue';
import Vuetify from 'vuetify';
import VueRouter from 'vue-router';
import VueIntl from 'vue-intl';

import colors from 'vuetify/es5/util/colors';
import 'shared/i18n/setup';

import 'vuetify/dist/vuetify.min.css';
import 'shared/styles/main.less';

import store from '../channelList/store';
import Catalog from './views/Catalog.vue';

import router from './router';

require('utils/translations');

Vue.use(Vuetify, {
  rtl: window.isRTL,
  theme: {
    purple: '#996189',
    primary: colors.blue.base, // @blue-500
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
Vue.use(VueIntl);
Vue.use(VueRouter);

new Vue({
  el: 'catalog',
  router,
  store,
  ...Catalog,
});
