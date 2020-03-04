import AccountsLayout from './views/AccountsLayout.vue';
import store from './store';
import router from './router';
import startApp from 'shared/app';

startApp({
  store,
  router,
  index: AccountsLayout,
});
