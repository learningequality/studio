import Vue from 'vue';
import Router from 'vue-router';
import DevHarness from '../shared/views/TipTapEditor/TipTapEditor/DevHarness.vue';

Vue.use(Router);
export default new Router({
  mode: 'history',
  base: '/editor-dev/',
  routes: [{ path: '/', component: DevHarness }],
});
