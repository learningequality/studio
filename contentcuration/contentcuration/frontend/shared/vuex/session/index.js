import throttle from 'lodash/throttle';
import client from '../../client';
import Languages from 'shared/leUtils/Languages';
import { TABLE_NAMES, CHANGE_TYPES, resetDB } from 'shared/data';
import { CURRENT_USER } from 'shared/data/constants';
import { Session } from 'shared/data/resources';

const GUEST_USER = {
  first_name: 'Guest',
};

function langCode(language) {
  // Turns a Django language name (en-gb) into an ISO language code (en-GB)
  // Copied and modified from Django's to_locale function that does something similar
  const index = language.indexOf('-');
  if (index >= 0) {
    if (language.slice(index + 1).length > 2) {
      return (
        language.slice(0, index).toLowerCase() +
        '-' +
        language[index + 1].toUpperCase() +
        language.slice(index + 2).toLowerCase()
      );
    }
    return language.slice(0, index).toLowerCase() + '-' + language.slice(index + 1).toUpperCase();
  } else {
    return language.toLowerCase();
  }
}

const throttleTime = 30 * 1000;

const deferredUser = throttle(
  function() {
    return client.get(window.Urls.deferred_user_data());
  },
  throttleTime,
  { trailing: false }
);

const settingsDeferredUser = throttle(
  function() {
    return client.get(window.Urls.deferred_user_data(), { params: { settings: true } });
  },
  throttleTime,
  { trailing: false }
);

export default {
  state: () => ({
    currentUser: GUEST_USER,
    preferences:
      window.user_preferences === 'string'
        ? JSON.parse(window.user_preferences)
        : window.user_preferences,
  }),
  currentLanguage: Languages.get(langCode(window.languageCode || 'en')),
  currentChannelId: window.channel_id || null,
  mutations: {
    ADD_SESSION(state, currentUser) {
      state.currentUser = currentUser;
    },
    UPDATE_SESSION(state, data) {
      state.currentUser = {
        ...state.currentUser,
        ...data,
      };
    },
    REMOVE_SESSION(state) {
      state.currentUser = GUEST_USER;
    },
  },
  getters: {
    currentUserId(state) {
      return state.currentUser.id;
    },
    loggedIn(state) {
      return (
        state.currentUser && state.currentUser.id !== undefined && state.currentUser.id !== null
      );
    },
    availableSpace(state) {
      return state.currentUser.available_space || null;
    },
    totalSpace(state) {
      return state.currentUser.disk_space;
    },
    storageUseByKind(state) {
      return state.currentUser.space_used_by_kind || null;
    },
    clipboardRootId(state) {
      return state.currentUser.clipboard_tree_id;
    },
  },
  actions: {
    async saveSession(context, currentUser) {
      await Session.put({
        ...currentUser,
        CURRENT_USER,
      });
      context.commit('ADD_SESSION', currentUser);
    },
    login(context, credentials) {
      return client.post(window.Urls.login(), credentials);
    },
    logout() {
      resetDB();
      return client.get(window.Urls.logout());
    },
    updateFullName(context, { first_name, last_name }) {
      context.commit('UPDATE_SESSION', { first_name, last_name });
    },
    fetchDeferredUserData(context, settings = false) {
      if (context.getters.availableSpace) {
        if (
          (context.getters.storageUseByKind && context.state.currentUser.api_token) ||
          !settings
        ) {
          return;
        }
      }
      let promise;
      if (settings) {
        promise = settingsDeferredUser();
      } else {
        promise = deferredUser();
      }
      return promise.then(response => {
        context.commit('UPDATE_SESSION', response.data);
      });
    },
  },
  listeners: {
    [TABLE_NAMES.SESSION]: {
      [CHANGE_TYPES.CREATED]: 'ADD_SESSION',
      [CHANGE_TYPES.UPDATED]: 'UPDATE_SESSION',
      [CHANGE_TYPES.DELETED]: 'REMOVE_SESSION',
    },
  },
};
