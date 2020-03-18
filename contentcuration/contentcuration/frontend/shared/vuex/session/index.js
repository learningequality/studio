import Languages from 'shared/leUtils/Languages';

function langCode(language) {
  // Turns a Django language name (en-gb) into an ISO language code (en-GB)
  // Copied and modified from Django's to_locale function that does something similar
  const index = language.indexOf('-');
  if (index >= 0) {
    if (language.slice(index + 1).length > 2) {
      return language.slice(0, index).toLowerCase() + '-' + language[index + 1].toUpperCase() + language.slice(index + 2).toLowerCase();
    }
    return language.slice(0, index).toLowerCase() + '-' + language.slice(index + 1).toUpperCase();
  } else {
    return language.toLowerCase();
  }
}

export default {
  state: () => ({
    currentUser: {
      first_name: 'Guest',
      ...(window.user || {}),
    },
    loggedIn: Boolean(window.user),
    preferences:
      window.user_preferences === 'string'
        ? JSON.parse(window.user_preferences)
        : window.user_preferences,
  }),
  currentLanguage: Languages.get(langCode(window.languageCode || 'en')),
  currentChannelId: window.channel_id || null,
  mutations: {
    SET_CURRENT_USER(state, currentUser) {
      state.currentUser = {
        ...currentUser,
      };
      state.loggedIn = Boolean(currentUser);
    },
  },
  getters: {
    currentUserId(state) {
      return state.currentUser.id;
    },
    availableSpace(state) {
      return state.currentUser.available_space;
    }
  },
};
