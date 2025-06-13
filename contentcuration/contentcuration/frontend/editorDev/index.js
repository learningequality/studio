import Vue from 'vue';
import Vuex from 'vuex';
import VueRouter from 'vue-router';
import TipTapEditor from '../shared/views/TipTapEditor/TipTapEditor/TipTapEditor.vue';
import startApp from 'shared/app';
import storeFactory from 'shared/vuex/baseStore';

Vue.use(VueRouter);
Vue.use(Vuex);

// Create a minimal store that has the required methods
const store = storeFactory();

startApp({
  store, // Provide the store - this is required Althought not needed
  router: new VueRouter({
    routes: [
      {
        path: '/',
        component: TipTapEditor,
      },
    ],
  }),
});
