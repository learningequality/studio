import Vue from 'vue';
import VueRouter from 'vue-router';
import Vuetify from 'vuetify';
import VueIntl from 'vue-intl';
import Croppa from 'vue-croppa';
import { theme, icons } from 'shared/vuetify';

import 'shared/i18n/setup';

import 'vuetify/dist/vuetify.min.css';
import 'shared/styles/main.less';
import Base from 'shared/views/Base.vue';

import { initializeDB } from 'shared/data';

Vue.use(Croppa);
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

export let rootVue;

export default function startApp({ store, router, index }) {
  initializeDB().then(() => {
    const config = {
      el: 'app',
      store,
      router,
    };

    if (index) {
      Object.assign(config, index);
    } else {
      Object.assign(config, Base);
    }

    rootVue = new Vue(config);
  });
}
