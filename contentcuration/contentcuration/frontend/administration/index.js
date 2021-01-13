import AdministrationIndex from './pages/AdministrationIndex.vue';
import store from './store';
import router from './router';
import startApp from 'shared/app';

startApp({
  store,
  router,
  index: AdministrationIndex,
});
