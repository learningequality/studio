import VueRouter from 'vue-router';
import { RouterNames } from './constants';
import Account from './views/Account/index.vue';
import Storage from './views/Storage/index.vue';
import UsingStudio from './views/UsingStudio';

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
