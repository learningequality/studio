import startApp from 'shared/app';
import SettingsIndex from './pages/SettingsIndex.vue';
import store from './store';
import router from './router';

startApp({
  router,
  store,
  index: SettingsIndex,
});
