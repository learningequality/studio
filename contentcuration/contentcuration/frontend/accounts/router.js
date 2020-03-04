import VueRouter from 'vue-router';
import Main from './pages/Main.vue';
import Create from './pages/Create.vue';
import ActivationSent from './pages/ActivationSent.vue';

const router = new VueRouter({
  routes: [
    {
      name: 'main',
      path: '/',
      component: Main,
    },
    {
      name: 'create',
      path: '/create',
      component: Create,
    },
    {
      name: 'activation-sent',
      path: '/activation-sent',
      component: ActivationSent,
    },
    {
      path: '*',
      redirect: '/',
    },
  ],
});

export default router;
