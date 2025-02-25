import throttle from 'lodash/throttle';
import client from 'shared/client';

const throttleTime = 30 * 1000;

const settingsDeferredUserApiToken = function () {
  return client.get(window.Urls.deferred_user_api_token());
};

const settingsDeferredUserSpaceByKind = throttle(
  function () {
    return client.get(window.Urls.deferred_user_space_by_kind());
  },
  throttleTime,
  { trailing: false },
);

export default {
  namespaced: true,
  state: {
    channels: window.channels,
  },
  actions: {
    exportData() {
      return client.get(window.Urls.export_user_data());
    },

    // Updates the user's full name in the backend
    // Payload ought to be an object with two keys:
    // first_name: String
    // last_name: String
    saveFullName(context, { first_name, last_name }) {
      return client
        .post(window.Urls.update_user_full_name(), { first_name, last_name })
        .then(() => {
          context.dispatch('updateFullName', { first_name, last_name }, { root: true });
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
        },
      );
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

    // Fetch the user API token
    fetchDeferredUserApiToken(context) {
      if (context.rootState.session.currentUser.api_token) {
        return;
      }

      return settingsDeferredUserApiToken().then(response => {
        context.commit(
          'UPDATE_SESSION',
          {
            api_token: response.data.api_token,
          },
          { root: true },
        );
      });
    },

    // Fetch the user storage details
    fetchDeferredUserStorageByKind(context) {
      if (context.rootGetters.storageUseByKind) {
        return;
      }

      return settingsDeferredUserSpaceByKind().then(response => {
        context.commit(
          'UPDATE_SESSION',
          {
            space_used_by_kind: response.data.space_used_by_kind,
          },
          { root: true },
        );
      });
    },
  },
};
