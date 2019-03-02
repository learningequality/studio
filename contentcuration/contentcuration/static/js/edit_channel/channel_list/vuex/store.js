import Vue from 'vue';
var mutations = require('./mutations');
var actions = require('./actions');
var getters = require('./getters');

const Vuex = require('vuex');
Vue.use(Vuex);

module.exports = new Vuex.Store({
  modules: {
    "channel_list": {
		namespaced: true,
		state: {
			channels: [],
			activeChannel: null,
			changed: false,
			channelChanges: {},
			channelSets: [],
			invitations: []
		},
		getters: getters,
	   	mutations: mutations,
  		actions: actions
  	}
  }
});
