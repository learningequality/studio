import Vue from 'vue';
import Router from 'vue-router';
import TipTapEditor from '../shared/views/TipTapEditor/TipTapEditor/TipTapEditor.vue';

Vue.use(Router);
export default new Router({
  mode: 'history',
  base: '/editor-dev/',
  routes: [{ path: '/', component: TipTapEditor }],
});
