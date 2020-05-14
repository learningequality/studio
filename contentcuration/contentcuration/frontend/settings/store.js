import client from 'shared/client';
import storeFactory from 'shared/vuex/baseStore';

const store = storeFactory({
  actions: {
    // Updates the user's full name in the backend
    // Payload ought to be an object with two keys:
    // fullName: Object { first_name: String, last_name: String }
    // email: String
    patchFullName(context, { email, fullName }) {
      return client.patch(
        window.Urls.update_user_full_name(email), 
        fullName
      );
    },

    // Updates the user's password
    // Payload ought to be an object with two keys:
    // password: String
    // email: String
    updateUserPassword(context, { email, password }) {
      return client.patch(
        window.Urls.change_password(email),
        { password },
      );
    },
  },
});

export default store;
