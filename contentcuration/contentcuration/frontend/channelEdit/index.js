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

const State = require('edit_channel/state');

Vue.use(VueIntl);
Vue.use(VueRouter);
Vue.use(Vuetify, {
  rtl: window.isRTL,
  // Enable css variables (e.g. `var(--v-grey-darken1)`)
  options: {
    customProperties: true,
  },
  theme: theme(),
  icons: icons(),
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
