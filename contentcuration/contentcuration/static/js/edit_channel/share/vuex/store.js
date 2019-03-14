import Vue from 'vue';
var Vuex = require('vuex');
var mutations = require('./mutations');
var actions = require('./actions');
var getters = require('./getters');
Vue.use(Vuex);

var store = new Vuex.Store({
  modules: {
    "share": {
		  namespaced: true,
		  state: {
		    accessList: [],
		    invitations: [],
		    channel: null,
		    recentlySent: null
		  },
		  actions: actions,
		  mutations: mutations,
		  getters: getters,
		}
  },
})

module.exports = store;
