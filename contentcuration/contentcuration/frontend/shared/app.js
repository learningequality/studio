import 'core-js';
import 'regenerator-runtime/runtime';
import Vue from 'vue';
import VueRouter from 'vue-router';
import Vuetify from 'vuetify';
import VueIntl from 'vue-intl';
import Croppa from 'vue-croppa';
import KThemePlugin from 'kolibri-design-system/lib/KThemePlugin';
import { CURRENT_SESSION_TABLE, KEY_CURRENT_USER_ID } from './data/constants';
import { resetDB, initializeDB } from './data';
import { theme, icons } from 'shared/vuetify';

import 'shared/i18n/setup';
import db from 'shared/data/db';

import './styles/vuetify.css';
import 'shared/styles/main.less';
import Base from 'shared/Base.vue';
import ActionLink from 'shared/views/ActionLink';

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

export default async function startApp({ store, router, index }) {
  await initializeDB();

  const userId = window.user ? window.user.id : null;
  const isAnonymous = userId === null;

  const previousUserId = await db[CURRENT_SESSION_TABLE].get(KEY_CURRENT_USER_ID);
  const isUserChange = userId !== previousUserId;

  if (!isAnonymous && isUserChange) {
    await resetDB();
    await db[CURRENT_SESSION_TABLE].put(userId, KEY_CURRENT_USER_ID);
  }

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
}
