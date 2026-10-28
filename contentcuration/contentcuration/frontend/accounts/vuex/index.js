import client from 'shared/client';

export default {
  namespaced: true,
  actions: {
    register(context, formData) {
      return client.post(window.Urls.register(), formData, {
        headers: {
          'Content-type': 'application/form-url-encode',
        },
      });
    },
    sendActivationLink(context, email) {
      return client.post(window.Urls.request_activation_link(), { email });
    },
    sendPasswordResetLink(context, email) {
      return client.post(window.Urls.auth_password_reset(), { email });
    },
    setPassword(context, { uidb64, new_password1, new_password2 }) {
      const data = {
        new_password1,
        new_password2,
      };
      // Django's PasswordResetConfirmView.reset_url_token
      // https://docs.djangoproject.com/en/3.2/topics/auth/default/#django.contrib.auth.views.PasswordResetConfirmView
      return client.post(window.Urls.auth_password_reset_confirm(uidb64, 'set-password'), data, {
        headers: {
          'Content-type': 'application/form-url-encode',
        },
      });
    },
  },
};
