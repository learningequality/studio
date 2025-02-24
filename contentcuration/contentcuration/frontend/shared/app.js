import 'regenerator-runtime/runtime';
import { liveQuery } from 'dexie';
import { init as SentryInit, globalHandlersIntegration } from '@sentry/vue';
import Vue from 'vue';
import VueRouter from 'vue-router';
import Vuetify, {
  // To generate this list of Vuetify components used in the Studio code base,
  // we can use some shell commands to look through all the components and extract
  // ones that are prefixed with 'V' - due to our component naming conventions
  // enforced by linting, this should capture all of them. The only possible issue might
  // be if we have imported a component from somewhere other than vuetify that prefixes
  // the component name with a V.
  // Use this shell command to regenerate this list:
  // egrep -o "<(V[A-Z][a-zA-Z]+)" -r -h --include "*.vue" . | egrep -o "V[a-zA-Z]+" | sort | uniq
  // This first greps all files ending in .vue for text starting with <V then
  // an uppercase letter and then any other letters.
  // This is then passed onto another egrep invocation that just looks for
  // the V and letters to give the component name.
  // This is then piped to sort and then uniq to give us a unique list of components.
  VAlert,
  VApp,
  VAutocomplete,
  VBadge,
  VBreadcrumbs,
  VBreadcrumbsItem,
  VBtn,
  VCard,
  VCardActions,
  VCardText,
  VCardTitle,
  VCheckbox,
  VChip,
  VCombobox,
  VContainer,
  VContent,
  VDataTable,
  VDatePicker,
  VDialog,
  VDivider,
  VEditDialog,
  VExpandTransition,
  VExpandXTransition,
  VExpansionPanel,
  VExpansionPanelContent,
  VFadeTransition,
  VFlex,
  VFooter,
  VForm,
  VHover,
  VImg,
  VInput,
  VLayout,
  VList,
  VListTile,
  VListTileAction,
  VListTileContent,
  VListTileSubTitle,
  VListTileTitle,
  VListTileAvatar,
  VNavigationDrawer,
  VPagination,
  VProgressCircular,
  VProgressLinear,
  VRadio,
  VRadioGroup,
  VScaleTransition,
  VSelect,
  VSheet,
  VSlideXReverseTransition,
  VSlideXTransition,
  VSlideYTransition,
  VSnackbar,
  VSpacer,
  VSpeedDial,
  VSubheader,
  VTab,
  VTabItem,
  VTabsItems,
  VTextarea,
  VTextField,
  VToolbar,
  VToolbarItems,
  VToolbarSideIcon,
  VToolbarTitle,
  VTooltip,
  VWindow,
  VWindowItem,
} from 'vuetify/lib';
import {
  // To generate a list of directives that are used, we use a similar bash command, but
  // are instead looking for directives of the form v- followed by a word.
  // We have to be a bit more intelligent to know which ones come from Vuetify, as it only has:
  // ClickOutside
  // Ripple
  // Resize
  // Scroll
  // Touch
  // so we are just looking for matches for any of these.
  /* eslint-disable-next-line */
  // egrep -o "(v-(resize|ripple|click-outside|scroll|touch))" -r -h --include "*.vue" . | sort | uniq
  ClickOutside,
  Ripple,
  Resize,
  Scroll,
} from 'vuetify/lib/directives';
import VueIntl from 'vue-intl';
import Croppa from 'vue-croppa';
import { Workbox, messageSW } from 'workbox-window';
import KThemePlugin from 'kolibri-design-system/lib/KThemePlugin';
import trackInputModality from 'kolibri-design-system/lib/styles/trackInputModality';

import AnalyticsPlugin from './analytics/plugin';
import { theme, icons } from 'shared/vuetify';

import { i18nSetup } from 'shared/i18n';

import './styles/vuetify.scss';
import 'shared/styles/main.scss';
import Base from 'shared/Base.vue';
import urls from 'shared/urls';
import ActionLink from 'shared/views/ActionLink';
import Icon from 'shared/views/Icon';
import Menu from 'shared/views/Menu';
import Divider from 'shared/views/Divider';
import { initializeDB, resetDB } from 'shared/data';
import { Session, injectVuexStore } from 'shared/data/resources';

// just say yes to devtools (in debug mode)
if (process.env.NODE_ENV !== 'production') {
  Vue.config.devtools = true;
} else if (window.sentryActive) {
  SentryInit({
    Vue,
    dsn: window.sentryDSN,
    environment: window.sentryEnvironment,
    release: window.sentryRelease,
    initialScope: {
      user: window.user ? { id: window.user.id, email: window.user.email } : null,
    },
    // onunhandledrejection reports just give us a dump of the Promise.reject object, and we often
    // get another error report with more useful data anyway, so ignore these for now.
    // They are most commonly triggered by a 500 response from an API endpoint call.
    integrations: [
      globalHandlersIntegration({ onerror: true, onunhandledrejection: false }),
    ],
    beforeSend: function(event) {
      // Ignore errors when CloudFlare-AlwaysOnline is in the user agent as these are errors serving
      // the offline version and I don't think we can fix or reproduce these easily.
      // Fix taken from here: https://github.com/getsentry/sentry-javascript/issues/617#issuecomment-227562203
      var isCloudFlare = /^(.*CloudFlare-AlwaysOnline.*)$/.test(window.navigator.userAgent);
      if (isCloudFlare) {
        return null;
      }
      return event;
    },
  });
}

Vue.use(Croppa);
Vue.use(VueIntl);
Vue.use(VueRouter);
Vue.use(Vuetify, {
  components: {
    // Explicitly register used Vuetify components globally
    // As it appears that the vuetify loader plugin causes memory leaks.
    VAlert,
    VApp,
    VAutocomplete,
    VBadge,
    VBreadcrumbs,
    VBreadcrumbsItem,
    VBtn,
    VCard,
    VCardActions,
    VCardText,
    VCardTitle,
    VCheckbox,
    VChip,
    VCombobox,
    VContainer,
    VContent,
    VDataTable,
    VDatePicker,
    VDialog,
    VDivider,
    VEditDialog,
    VExpandTransition,
    VExpandXTransition,
    VExpansionPanel,
    VExpansionPanelContent,
    VFadeTransition,
    VFlex,
    VFooter,
    VForm,
    VHover,
    VImg,
    VInput,
    VLayout,
    VList,
    VListTile,
    VListTileAction,
    VListTileContent,
    VListTileSubTitle,
    VListTileTitle,
    VListTileAvatar,
    VNavigationDrawer,
    VPagination,
    VProgressCircular,
    VProgressLinear,
    VRadio,
    VRadioGroup,
    VScaleTransition,
    VSelect,
    VSheet,
    VSlideXReverseTransition,
    VSlideXTransition,
    VSlideYTransition,
    VSnackbar,
    VSpacer,
    VSpeedDial,
    VSubheader,
    VTab,
    VTabItem,
    VTabsItems,
    VTextarea,
    VTextField,
    VToolbar,
    VToolbarItems,
    VToolbarSideIcon,
    VToolbarTitle,
    VTooltip,
    VWindow,
    VWindowItem,
  },
  directives: {
    // Explicitly register used directives.
    ClickOutside,
    Ripple,
    Resize,
    Scroll,
  },
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
Vue.component('Divider', Divider);
Vue.component('Icon', Icon);

function initiateServiceWorker() {
  // Second conditional must be removed if you are doing dev work on the service
  // worker.
  if ('serviceWorker' in navigator) {
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
  trackInputModality();
  await initiateServiceWorker();
  await initializeDB();
  await i18nSetup();

  const currentUser = window.user || {};
  const dbCurrentUser = (await Session.getSession()) || {};

  if (
    dbCurrentUser.id !== undefined &&
    dbCurrentUser.id !== null &&
    dbCurrentUser.id !== currentUser.id
  ) {
    await resetDB();
  }

  let subscription;

  if (currentUser.id !== undefined && currentUser.id !== null) {
    // The user is logged on, so persist that to the session table in indexeddb
    await store.dispatch('saveSession', currentUser, { root: true });
    // Also watch in case the user logs out, then we should redirect to the login page
    const observable = liveQuery(() => {
      return Session.table.toCollection().first(Boolean);
    });

    subscription = observable.subscribe({
      next(result) {
        if (!result && !window.location.pathname.endsWith(urls.accounts())) {
          window.location = urls.accounts();
        }
      },
      error() {
        subscription.unsubscribe();
      },
    });
  }

  await Session.setChannelScope();

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
    if (e.currentTarget.location.origin !== window.location.origin) {
      return;
    }
    const logoutConfirmed = window.sessionStorage.getItem('logoutConfirmed');
    const areAllChangesSaved = store.getters['areAllChangesSaved'];

    if (!logoutConfirmed && !areAllChangesSaved) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  // Provide access to the Store in the resource module to allow non-indexedDB access
  // to the session state.
  injectVuexStore(store);

  // Start listening for unsynced change events in IndexedDB
  store.listenForIndexedDBChanges();

  rootVue = new Vue(config);

  // Return a cleanup function
  return function() {
    if (subscription) {
      subscription.unsubscribe();
    }
    store.stopListeningForIndexedDBChanges();
  };
}
