import VueRouter from 'vue-router';
import Main from './pages/Main.vue';
import Create from './pages/Create.vue';
import ActivationSent from './pages/ActivationSent.vue';
import ForgotPassword from './pages/ForgotPassword.vue';

function pageRoute(path, component) {
  return {
    path,
    name: component.name,
    component: component,
  };
}

const router = new VueRouter({
  routes: [
    pageRoute('/', Main),
    pageRoute('/create', Create),
    pageRoute('/activation-sent', ActivationSent),
    pageRoute('/forgot-password', ForgotPassword),
    {
      path: '*',
      redirect: '/',
    },
  ],
});

export default router;
