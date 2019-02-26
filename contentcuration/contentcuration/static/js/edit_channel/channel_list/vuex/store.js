import Vue from 'vue';
import { ListTypes } from './../constants';
var mutations = require('./mutations');
var actions = require('./actions');

const Vuex = require('vuex');
Vue.use(Vuex);

let defaultListType = ListTypes.EDITABLE;
switch(window.location.hash.substr(1)) {
	case "starred":
		defaultListType = ListTypes.STARRED;
		break;
	case "viewonly":
		defaultListType = ListTypes.VIEW_ONLY;
		break;
	case "public":
		defaultListType = ListTypes.PUBLIC;
		break;
	case "collection":
		defaultListType = ListTypes.CHANNEL_SETS;
		break;
}

module.exports = new Vuex.Store({
  modules: {
    "channel_list": {
		namespaced: true,
		state: {
			activeList: defaultListType,
			channels: [],
			activeChannel: null,
			changed: false,
			channelChanges: {},
			channelSets: [],
			invitations: []
		},
		getters: {
			activeList(state) {
			  return state.activeList;
			},
			activeChannel(state) {
			  return state.activeChannel;
			},
			channels(state) {
			  return state.channels;
			},
			channelSets(state) {
				return state.channelSets;
			},
			invitations(state) {
				return state.invitations;
			},
			channelChanges(state) {
				return state.channelChanges;
			},
			changed(state) {
				return state.changed;
			}
		},
	   	mutations: mutations,
  		actions: actions
  	}
  }
});
