import VueRouter from 'vue-router';
import Main from './views/pages/Main.vue';

const router = new VueRouter({
  routes: [
    {
      name: 'main',
      path: '/',
      props: true,
      component: Main,
    },
    {
      path: '*',
      redirect: '/',
    },
  ],
});

export default router;
