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
  },
};
