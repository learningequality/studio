import Vue from 'vue';
import _ from 'underscore';
var Vuex = require('vuex');
var { ListTypes, ChannelListGetFunctions } = require('./constants');
Vue.use(Vuex);

var store = new Vuex.Store({
  modules: {
    "channel_list": {
		namespaced: true,
		state: {
			activeList: ListTypes.EDITABLE,
			channels: [],
			activeChannel: null
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
			starredChannels(state) {
				return _.where(state.channels, {[ListTypes.STARRED]: true});
			}
		},
	   	mutations: {
		    RESET_CHANNEL_STATE(state) {
			  Object.assign(state, {
			    activeList: ListTypes.EDITABLE,
			    channelLists: {},
			    channels: [],
			    activeChannel: null
			  });
			},
			SET_ACTIVE_LIST(state, listType) {
				state.activeList = listType;
			},
			SET_ACTIVE_CHANNEL(state, channel) {
				state.activeChannel = channel;
			},
			SET_CHANNEL_LIST(state, payload) {
				_.each(payload.channels, (channel)=> {
					let match = _.findWhere(state.channels, {id: channel.id})
					if(match) {  // If it exists, set the existing channel's listType to true
						match[payload.listType] = true;
					} else {  // Otherwise, add to the list of channels
						channel[payload.listType] = true;
						state.channels.push(channel);
					}
				});
			}
  		},
  		actions: {
		    loadChannelList: function(context, listType) {
		    	return new Promise((resolve, reject) => {
		    		ChannelListGetFunctions[listType]().then(function (channels) {
		    			context.commit('SET_CHANNEL_LIST', {
		    				listType: listType,
		    				channels: channels.toJSON()
		    			});
		    			resolve(channels);
		    		});
		        })
		    }
		}
    }
  }
});

module.exports = store;
