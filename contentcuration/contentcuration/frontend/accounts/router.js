import VueRouter from 'vue-router';
import Main from './pages/Main';
import Create from './pages/Create';
import ActivationSent from './pages/ActivationSent';
import ForgotPassword from './pages/ForgotPassword';
import PasswordInstructionsSent from './pages/PasswordInstructionsSent';
import AccountCreated from './pages/AccountCreated';
import ActivationExpired from './pages/ActivationExpired';
import ResetPassword from './pages/ResetPassword';
import ResetPasswordSuccess from './pages/ResetPasswordSuccess';

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

    // Registration routes
    pageRoute('/create', Create),
    pageRoute('/activation-sent', ActivationSent),
    pageRoute('/account-created', AccountCreated),
    pageRoute('/activation-expired', ActivationExpired),

    // Forgot password routes
    pageRoute('/forgot-password', ForgotPassword),
    pageRoute('/reset-password', ResetPassword),
    pageRoute('/password-reset-sent', PasswordInstructionsSent),
    pageRoute('/password-reset-success', ResetPasswordSuccess),
    {
      path: '*',
      redirect: '/',
    },
  ],
});

export default router;
