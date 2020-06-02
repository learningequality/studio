import SettingsIndex from './views/SettingsIndex.vue';
import store from './store';
import router from './router';
import startApp from 'shared/app';

startApp({
  router,
  store,
  index: SettingsIndex,
});
