import VueRouter from 'vue-router';
import { RouteNames } from './constants';
import Account from './pages/Account/index';
import Storage from './pages/Storage/index';
import UsingStudio from './pages/UsingStudio';

const router = new VueRouter({
  routes: [
    {
      name: RouteNames.ACCOUNT,
      path: '/account',
      props: true,
      component: Account,
    },
    {
      name: RouteNames.STORAGE,
      path: '/storage',
      props: true,
      component: Storage,
    },
    {
      name: RouteNames.USING_STUDIO,
      path: '/using-studio',
      props: true,
      component: UsingStudio,
    },
    // Unrecognized paths go to default Account path
    {
      path: '*',
      redirect: { name: RouteNames.ACCOUNT },
    },
  ],
});

export default router;
