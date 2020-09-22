import 'core-js';
import 'regenerator-runtime/runtime';
import Vue from 'vue';
import VueRouter from 'vue-router';
import Vuetify from 'vuetify';
import VueIntl from 'vue-intl';
import Croppa from 'vue-croppa';
import KThemePlugin from 'kolibri-design-system/lib/KThemePlugin';
import { theme, icons } from 'shared/vuetify';

import 'shared/i18n/setup';

import './styles/vuetify.css';
import 'shared/styles/main.less';
import Base from 'shared/Base.vue';
import ActionLink from 'shared/views/ActionLink';

import { initializeDB } from 'shared/data';

// just say yes to devtools (in debug mode)
if (process.env.NODE_ENV !== 'production') {
  Vue.config.devtools = true;
}

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

// Register kolibri-design-system plugin
Vue.use(KThemePlugin);

// Register global components
Vue.component('ActionLink', ActionLink);

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
