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

const State = require('edit_channel/state');

Vue.use(VueIntl);
Vue.use(VueRouter);
Vue.use(Vuetify, {
  rtl: window.isRTL,
  theme: {
    purple: '#996189',
    primary: '#996189', //colors.blue.base, // @blue-500
    secondary: '#8DC5B6',
    primaryBackground: colors.purple.lighten5,
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

// TODO: Remove block once integrated into tree
window.preferences = {
  license: 'Public Domain',
  copyright_holder: 'Default Copyright Holder',
};
State.currentNode = {
  id: window.root_id,
  title: 'Sandbox Topic',
  metadata: {
    max_sort_order: 0,
  },
};

// End remove block

new Vue({
  el: '#sandbox',
  store,
  router,
  ...ChannelEditIndex,
});
