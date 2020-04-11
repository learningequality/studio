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
  },
};
