import startApp from 'shared/app';
import AdministrationIndex from './pages/AdministrationIndex.vue';
import store from './store';
import router from './router';

startApp({
  store,
  router,
  index: AdministrationIndex,
});
