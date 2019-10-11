import VueRouter from 'vue-router';
import { RouterNames } from './constants';
import Sandbox from 'shared/views/Sandbox';

const router = new VueRouter({
  routes: [
    {
      name: RouterNames.SANDBOX,
      path: '/sandbox/',
      component: Sandbox,
    },
  ],
});

export default router;
