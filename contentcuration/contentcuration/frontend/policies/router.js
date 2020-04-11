import VueRouter from 'vue-router';
import Policy from './pages/Policy';

function pageRoute(path, component) {
  return {
    path,
    name: component.name,
    component: component,
  };
}

const router = new VueRouter({
  routes: [
    pageRoute('/', Policy),
    {
      path: '*',
      redirect: '/',
    },
  ],
});

export default router;
