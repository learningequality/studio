import debounce from 'lodash/debounce';
import client from '../../client';
import Languages from 'shared/leUtils/Languages';
import { TABLE_NAMES, CHANGE_TYPES, resetDB } from 'shared/data';
import { CURRENT_USER } from 'shared/data/constants';
import { Session, User } from 'shared/data/resources';
import { forceServerSync } from 'shared/data/serverSync';
import translator from 'shared/translator';

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
    usedSpace(state) {
      return state.currentUser.disk_space_used;
    },
    totalSpace(state) {
      return state.currentUser.disk_space;
    },
    availableSpace(state, getters) {
      return getters.totalSpace - getters.usedSpace;
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
    logout({ rootGetters }) {
      const areAllChangesSaved = rootGetters['areAllChangesSaved'];
      if (areAllChangesSaved) {
        return client.get(window.Urls.logout()).then(resetDB);
      }

      if (window.confirm(translator.$tr('confirmLogout'))) {
        // This information will be used in 'beforeunload' event handler
        // to prevent it from prompting users again if they have already
        // confirmed here that they want to leave
        window.sessionStorage.setItem('logoutConfirmed', true);

        return forceServerSync()
          .then(() => {
            return client.get(window.Urls.logout());
          })
          .then(() => {
            resetDB();
            window.sessionStorage.setItem('logoutConfirmed', false);
          });
      }
    },
    updateFullName(context, { first_name, last_name }) {
      context.commit('UPDATE_SESSION', { first_name, last_name });
    },
    fetchUserStorage: debounce(function(context) {
      return client.get(window.Urls.user_get_storage_used()).then(({ data }) => {
        return User.updateDiskSpaceUsed(context.getters.currentUserId, data).then(() => {
          context.commit('UPDATE_SESSION', { disk_space_used: data });
        });
      });
    }, 500),
  },
  listeners: {
    [TABLE_NAMES.SESSION]: {
      [CHANGE_TYPES.CREATED]: 'ADD_SESSION',
      [CHANGE_TYPES.UPDATED]: 'UPDATE_SESSION',
      [CHANGE_TYPES.DELETED]: 'REMOVE_SESSION',
    },
  },
};
