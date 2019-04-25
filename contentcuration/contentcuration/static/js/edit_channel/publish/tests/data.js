import Vue from 'vue';

const Vuex = require('vuex');
const Vuetify = require('vuetify');
var mutations = require('edit_channel/publish/vuex/mutations');
var actions = require('edit_channel/publish/vuex/actions');

Vue.use(Vuex);
Vue.use(Vuetify);

export const mockFunctions = {
  publishChannel: jest.fn(),
  setChannelLanguage: jest.fn(),
  loadChannelSize: jest.fn(),
};

export const localStore = new Vuex.Store({
  modules: {
    publish: {
      namespaced: true,
      state: {
        channel: null,
        tempTaskID: null,
      },
      getters: {
        taskID(state) {
          return state.tempTaskID;
        },
      },
      mutations: mutations,
      actions: {
        ...actions,
        publishChannel: context => {
          context.commit('SET_TASK', 'test');
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
