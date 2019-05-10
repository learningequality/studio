import Vue from 'vue';

const Vuex = require('vuex');
const Vuetify = require('vuetify');
const publish = require('edit_channel/vuexModules/publish');

Vue.use(Vuex);
Vue.use(Vuetify);

export const mockFunctions = {
  publishChannel: jest.fn(),
  setChannelLanguage: jest.fn(),
  loadChannelSize: jest.fn(),
};

export const localStore = new Vuex.Store({
  modules: {
    asyncTask: {
      namespaced: false,
      state: {
        currentTask: null,
      },
      getters: {
        currentTask(state) {
          return state.currentTask;
        },
      },
      mutations: {
        SET_CURRENT_TASK(state, task) {
          state.currentTask = task;
        },
      },
      actions: {
        ...publish.actions,
      },
    },
    publish: {
      namespaced: true,
      state: {
        channel: null,
      },
      mutations: publish.mutations,
      actions: {
        ...publish.actions,
        publishChannel: context => {
          context.commit('SET_CURRENT_TASK', 'test', { root: true });
          mockFunctions.publishChannel();
        },
        setChannelLanguage: (context, languageID) => {
          context.commit('SET_CHANNEL_LANGUAGE', languageID);
          mockFunctions.setChannelLanguage();
        },
        loadChannelSize: () => {
          return new Promise(resolve => {
            mockFunctions.loadChannelSize();
            resolve(null);
          });
        },
      },
    },
  },
});
