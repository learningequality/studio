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
      return client.post(
        window.Urls.auth_password_reset(),
        { email },
        {
          headers: {
            'Content-type': 'application/form-url-encode',
          },
        }
      );
    },
    setPassword(context, { uidb64, token, new_password1, new_password2 }) {
      let data = new FormData();

      data.append('new_password1', new_password1);
      data.append('new_password2', new_password2);

      return client.post(window.Urls.auth_password_reset_confirm(uidb64, token), data, {
        headers: {
          'Content-type': undefined,
        },
      });
    },
  },
};
