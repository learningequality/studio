import Constants from 'edit_channel/constants/index';

export default {
  state: () => ({
    currentUser: {
      first_name: 'Guest',
      ...(window.user || {}),
    },
    preferences:
      window.user_preferences === 'string'
        ? JSON.parse(window.user_preferences)
        : window.user_preferences,
  }),
  currentLanguage: Constants.Languages.find(
    l => l.id && l.id.toLowerCase() === (window.languageCode || 'en')
  ),
  mutations: {
    SET_CURRENT_USER(state, currentUser) {
      state.currentUser = {
        ...currentUser,
      };
    },
  },
  getters: {
    currentUserId(state) {
      return state.currentUser.id;
    },
  },
};
