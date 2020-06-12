import client from 'shared/client';

export default {
  namespaced: true,
  actions: {
    exportData() {
      return client.post(window.Urls.export_user_data());
    },
    // Updates the user's full name in the backend
    // Payload ought to be an object with two keys:
    // first_name: String
    // last_name: String
    saveFullName(context, { first_name, last_name }) {
      const fullName = { first_name, last_name };
      return client.post(window.Urls.update_user_full_name(), fullName).then(() => {
        context.commit('UPDATE_CURRENT_USER', fullName, { root: true });
      });
    },

    // Updates the user's password
    // Payload ought to be an object with one key:
    // password: String
    updateUserPassword(context, password) {
      return client.post(
        window.Urls.change_password(),
        {
          new_password1: password,
          new_password2: password,
        },
        {
          headers: {
            'Content-type': 'application/form-url-encode',
          },
        }
      );
    },

    // Sends issue report
    // Payload ought to be an object with four keys:
    // operating_system: String
    // browser: String
    // channel: String
    // description: String
    reportIssue(context, formData) {
      return client.post(window.Urls.issues_settings(), formData);
    },

    // Sends storageRequest
    // Payload ought to be an object with these keys:
    // storage: String (required)
    // kind: String (required)
    // resource_count: String (required)
    // resource_size: String
    // creators: String (required)
    // sample_link: String
    // license: comma separated list (required)
    // public: comma separated list
    // audience: String (required)
    // location: comma separated list
    // import_count: String (required)
    // uploading_for: String (required)
    // organization_type: String (required if org selected)
    // time_constraint: String
    // message: String (required)
    requestStorage(context, formData) {
      return client.post(window.Urls.request_storage(), formData);
    },

    // Sends deleteAccount request
    // Payload must have an email for confirmation
    deleteAccount(context, email) {
      return client.post(window.Urls.delete_user_account(), { email });
    },
  },
};
