import VueRouter from 'vue-router';
import AccountsMain from './pages/AccountsMain.vue';
import Create from './pages/Create';

import ActivationSent from './pages/activateAccount/ActivationSent';
import AccountCreated from './pages/activateAccount/AccountCreated';
import ActivationExpired from './pages/activateAccount/ActivationExpired';
import RequestNewActivationLink from './pages/activateAccount/RequestNewActivationLink';
import AccountNotActivated from './pages/activateAccount/AccountNotActivated';
import ActivationLinkReSent from './pages/activateAccount/ActivationLinkReSent';

import ForgotPassword from './pages/resetPassword/ForgotPassword';
import PasswordInstructionsSent from './pages/resetPassword/PasswordInstructionsSent';
import ResetPassword from './pages/resetPassword//ResetPassword';
import ResetPasswordSuccess from './pages/resetPassword/ResetPasswordSuccess';
import ResetLinkExpired from './pages/resetPassword/ResetLinkExpired';

import AccountDeleted from './pages/accountDeleted/AccountDeleted';

function pageRoute(path, component, name = null) {
  return {
    path,
    name: name || component.name,
    component: component,
  };
}

const router = new VueRouter({
  routes: [
    pageRoute('/', AccountsMain, 'Main'),

    // Registration routes
    pageRoute('/create', Create),
    pageRoute('/activation-sent', ActivationSent),
    pageRoute('/account-created', AccountCreated),
    pageRoute('/account-not-active', AccountNotActivated),
    pageRoute('/activation-expired', ActivationExpired),
    pageRoute('/request-activation-link', RequestNewActivationLink),
    pageRoute('/activation-resent', ActivationLinkReSent),

    // Forgot password routes
    pageRoute('/forgot-password', ForgotPassword),
    pageRoute('/reset-password', ResetPassword),
    pageRoute('/password-reset-sent', PasswordInstructionsSent),
    pageRoute('/password-reset-success', ResetPasswordSuccess),
    pageRoute('/reset-expired', ResetLinkExpired),

    // Deleted account page
    pageRoute('/account-deleted', AccountDeleted),
    {
      path: '*',
      redirect: '/',
    },
  ],
});

export default router;
