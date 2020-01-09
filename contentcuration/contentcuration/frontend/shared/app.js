import Vue from 'vue';
import VueRouter from 'vue-router';
import Vuetify from 'vuetify';
import { theme, icons } from 'shared/vuetify';

import 'shared/i18n/setup';

import 'vuetify/dist/vuetify.min.css';
import 'shared/styles/main.less';

import { initializeDB } from 'shared/data';

Vue.use(VueRouter);
Vue.use(Vuetify, {
  rtl: window.isRTL,
  theme: theme(),
  icons: icons(),
});

export let rootVue;

export default function startApp({
  store,
  router,
  index,
}) {
  initializeDB().then(() => {
    rootVue = new Vue({
      el: 'app',
      store,
      router,
      ...index,
    });
  });
}
