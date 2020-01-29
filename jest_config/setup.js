import Vue from 'vue';
import Vuetify from 'vuetify';
import VueRouter from 'vue-router';
import Vuex from 'vuex';
// Polyfill indexeddb
import "fake-indexeddb/auto";
import { setupSchema } from 'shared/data';

Vue.use(Vuetify);
Vue.use(VueRouter);
Vue.use(Vuex);

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
