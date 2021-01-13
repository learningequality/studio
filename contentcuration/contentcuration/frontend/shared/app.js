import 'core-js';
import 'regenerator-runtime/runtime';
import Vue from 'vue';
import VueRouter from 'vue-router';
import Vuetify from 'vuetify';
import VueIntl from 'vue-intl';
import Croppa from 'vue-croppa';
import { Workbox, messageSW } from 'workbox-window';
import KThemePlugin from 'kolibri-design-system/lib/KThemePlugin';
import AnalyticsPlugin from './analytics/plugin';

import { theme, icons } from 'shared/vuetify';

import { i18nSetup } from 'shared/i18n';

import './styles/vuetify.css';
import 'shared/styles/main.less';
import Base from 'shared/Base.vue';
import ActionLink from 'shared/views/ActionLink';
import Menu from 'shared/views/Menu';
import { initializeDB, resetDB } from 'shared/data';
import { CURRENT_USER } from 'shared/data/constants';
import { Session } from 'shared/data/resources';

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

// Register analytics plugin with dataLayer that should already be defined
Vue.use(AnalyticsPlugin, { dataLayer: window.dataLayer });

// Register global components
Vue.component('ActionLink', ActionLink);
Vue.component('Menu', Menu);

function initiateServiceWorker() {
  // Second conditional must be removed if you are doing dev work on the service
  // worker.
  if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
    const wb = new Workbox(window.Urls.service_worker());
    let registration;

    const showSkipWaitingPrompt = event => {
      // `event.wasWaitingBeforeRegister` will be false if this is
      // the first time the updated service worker is waiting.
      // When `event.wasWaitingBeforeRegister` is true, a previously
      // updated service worker is still waiting.
      // You may want to customize the UI prompt accordingly.

      // Force the user to refresh their page as we don't support
      // old interface versions at the moment
      if (event.isUpdate) {
        // Assuming the user accepted the update, set up a listener
        // that will reload the page as soon as the previously waiting
        // service worker has taken control.
        wb.addEventListener('controlling', () => {
          window.location.reload();
        });

        if (registration && registration.waiting) {
          // Send a message to the waiting service worker,
          // instructing it to activate.
          // Note: for this to work, you have to add a message
          // listener in your service worker. See below.
          messageSW(registration.waiting, { type: 'SKIP_WAITING' });
        }
      }
    };

    // Add an event listener to detect when the registered
    // service worker has installed but is waiting to activate.
    wb.addEventListener('waiting', showSkipWaitingPrompt);
    wb.addEventListener('externalwaiting', showSkipWaitingPrompt);

    return wb.register().then(r => (registration = r));
  } else {
    return Promise.resolve();
  }
}

export let rootVue;

export default async function startApp({ store, router, index }) {
  await initiateServiceWorker();
  await initializeDB();
  await i18nSetup();

  const currentUser = window.user || {};
  const dbCurrentUser = (await Session.get(CURRENT_USER)) || {};

  if (
    dbCurrentUser.id !== undefined &&
    dbCurrentUser.id !== null &&
    dbCurrentUser.id !== currentUser.id
  ) {
    await resetDB();
  }
  if (currentUser.id !== undefined && currentUser.id !== null) {
    await store.dispatch('saveSession', currentUser, { root: true });
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

  window.addEventListener('beforeunload', e => {
    const logoutConfirmed = window.sessionStorage.getItem('logoutConfirmed');
    const areAllChangesSaved = store.getters['areAllChangesSaved'];

    if (!logoutConfirmed && !areAllChangesSaved) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  rootVue = new Vue(config);
}
