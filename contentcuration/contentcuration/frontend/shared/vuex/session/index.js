import client from '../../client';
import Constants from 'edit_channel/constants/index';

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
  currentLanguage: Constants.Languages.find(
    l => l.id && l.id.toLowerCase() === (window.languageCode || 'en')
  ),
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
  },
  actions: {
    login(context, credentials) {
      return client.post(window.Urls.login(), credentials);
    },
    logout(context) {
      return client.get(window.Urls.logout()).then(() => {
        context.commit('SET_CURRENT_USER', {});
        localStorage['loggedOut'] = true;
        window.location = '/';
      });
    },
  },
};
