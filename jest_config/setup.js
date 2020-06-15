import 'core-js';
import 'regenerator-runtime/runtime';
import Vue from 'vue';
import Vuetify from 'vuetify';
import VueRouter from 'vue-router';
import Vuex from 'vuex';
import 'shared/i18n/setup';
// Polyfill indexeddb
import 'fake-indexeddb/auto';
import { setupSchema } from 'shared/data';
import icons from 'shared/vuetify/icons';

Vue.use(VueRouter);
Vue.use(Vuex);
Vue.use(Vuetify, {
  icons: icons(),
});

Vue.config.silent = true;
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

setupSchema();
