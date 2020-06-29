import VueRouter from 'vue-router';
import { RouterNames } from './constants';
import Account from './pages/Account/index';
import Storage from './pages/Storage/index';
import UsingStudio from './pages/UsingStudio';

const router = new VueRouter({
  routes: [
    {
      name: RouterNames.ACCOUNT,
      path: '/account',
      props: true,
      component: Account,
    },
    {
      name: RouterNames.STORAGE,
      path: '/storage',
      props: true,
      component: Storage,
    },
    {
      name: RouterNames.USING_STUDIO,
      path: '/using-studio',
      props: true,
      component: UsingStudio,
    },
    // Unrecognized paths go to default Account path
    {
      path: '*',
      redirect: { name: RouterNames.ACCOUNT },
    },
  ],
});

export default router;
