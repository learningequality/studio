import 'regenerator-runtime/runtime';
import * as Aphrodite from 'aphrodite';
import * as AphroditeNoImportant from 'aphrodite/no-important';
import Vue from 'vue';
import Vuetify from 'vuetify';
import VueRouter from 'vue-router';
import Vuex from 'vuex';
import KThemePlugin from 'kolibri-design-system/lib/KThemePlugin';
import '@testing-library/jest-dom';
import 'shared/i18n/setup';
// Polyfill structured clone for indexeddb with JSDOM
import "core-js/stable/structured-clone";
// Polyfill indexeddb
import 'fake-indexeddb/auto';
// Polyfill webstreams
import {ReadableStream, WritableStream, TransformStream, CountQueuingStrategy} from 'web-streams-polyfill';
import jquery from 'jquery';

window.jQuery = window.$ = jquery;
window.ReadableStream = global.ReadableStream = ReadableStream;
window.WritableStream = global.WritableStream = WritableStream;
window.TransformStream = global.TransformStream = TransformStream;
window.CountQueuingStrategy = global.CountQueuingStrategy = CountQueuingStrategy;

import AnalyticsPlugin from 'shared/analytics/plugin';
import { setupSchema } from 'shared/data';
import * as resources from 'shared/data/resources';
import icons from 'shared/vuetify/icons';
import ActionLink from 'shared/views/ActionLink';
import { i18nSetup } from 'shared/i18n';
import { resetJestGlobal } from 'shared/utils/testing'

global.beforeEach(() => {
  return new Promise(resolve => {
    Aphrodite.StyleSheetTestUtils.suppressStyleInjection();
    AphroditeNoImportant.StyleSheetTestUtils.suppressStyleInjection();
    return process.nextTick(resolve);
  });
});

global.afterEach(() => {
  return new Promise(resolve => {
    Aphrodite.StyleSheetTestUtils.clearBufferAndResumeStyleInjection();
    AphroditeNoImportant.StyleSheetTestUtils.clearBufferAndResumeStyleInjection();
    return process.nextTick(resolve);
  });
});

window.storageBaseUrl = '/content/storage/';

Vue.use(VueRouter);
Vue.use(Vuex);
Vue.use(Vuetify, {
  icons: icons(),
});
// Register kolibri-design-system plugin
Vue.use(KThemePlugin);

// Register analytics plugin with plain array
Vue.use(AnalyticsPlugin, { dataLayer: [] });

// Register global components
Vue.component('ActionLink', ActionLink);

i18nSetup(true);

Vue.config.silent = true;
Vue.config.devtools = false;
Vue.config.productionTip = false;

const csrf = global.document.createElement('input');
csrf.name = 'csrfmiddlewaretoken';
csrf.value = 'csrfmiddlewaretoken';
global.document.body.append(csrf);
global.document.body.setAttribute('data-app', true);
global.window.Urls = new Proxy(
  {},
  {
    get(obj, prop) {
      return () => prop;
    },
  }
);

Object.values(resources).forEach(resource => {
  if (resource.fetchCollection) {
    resource.fetchCollection = () => Promise.resolve([]);
  }
  if (resource.fetchModel) {
    resource.fetchModel = () => Promise.resolve({});
  }
});

jest.setTimeout(10000); // 10 sec

Object.defineProperty(window, 'scrollTo', { value: () => {}, writable: true });

resetJestGlobal();

setupSchema();
