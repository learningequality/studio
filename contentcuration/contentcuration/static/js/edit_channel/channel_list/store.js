import Vue from 'vue';
import _ from 'underscore';
import State from 'edit_channel/state';

var Vuex = require('vuex');
var { ListTypes, ChannelListGetFunctions } = require('./constants');
Vue.use(Vuex);

console.log(window.location.hash.substr(1))

let defaultListType = ListTypes.EDITABLE;
switch(window.location.hash.substr(1)) {
	case "starred":
		defaultListType = ListTypes.STARRED;
		break;
	case "viewonly":
		defaultListType = ListTypes.VIEWONLY;
		break;
	case "public":
		defaultListType = ListTypes.PUBLIC;
		break;
	// case "collection":
	// 	defaultListType = ListTypes.COLLECTION;
	// 	break;
}

var store = new Vuex.Store({
  modules: {
    "channel_list": {
		namespaced: true,
		state: {
			activeList: defaultListType,
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
				let listValues = _.values(ListTypes);
				_.each(payload.channels, (channel)=> {
					let match = _.findWhere(state.channels, {id: channel.id})
					if(match) {  // If it exists, set the existing channel's listType to true
						match[payload.listType] = true;
					} else {  // Otherwise, add to the list of channels
						_.each(listValues, (type) => {  // Need to set all attributes so vue will listen know to listen to them
							channel[type] = payload.listType === type;
						});
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
		        });
		    },
		    addStar: function(context, channel) {
		    	channel.STARRING = true;
	    		$.ajax({
	                method: "POST",
	                data: JSON.stringify({
	                    "channel_id": channel.id,
	                    "user_id": State.current_user.id
	                }),
	                url: window.Urls.add_bookmark(),
	                success: () => {
	                	channel.STARRED = true;
	                	channel.STARRING = false;
	                }
	            });
		    },
		    removeStar: function(context, channel) {
		    	channel.STARRING = true;
	    		$.ajax({
	                method: "POST",
	                data: JSON.stringify({
	                    "channel_id": channel.id,
	                    "user_id": State.current_user.id
	                }),
	                url: window.Urls.remove_bookmark(),
	                success: () => {
	                	channel.STARRED = false;
	                	channel.STARRING = false;
	                }
	            });
		    }
		}
    }
  }
});

module.exports = store;
