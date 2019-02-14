import Vue from 'vue';
import _ from 'underscore';
import State from 'edit_channel/state';

import Models from 'edit_channel/models';

var Vuex = require('vuex');
var { ListTypes, ChannelListGetFunctions } = require('./constants');
Vue.use(Vuex);

let defaultListType = 'CHANNEL_SETS'; //ListTypes.EDITABLE;
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
		defaultListType = 'CHANNEL_SETS';
		break;
}

const ListValues = _.values(ListTypes);
function prepChannel(channel) {
	_.each(ListValues, (type) => {  // Need to set all attributes so vue will listen know to listen to them
		channel[type] = false;
	});
}

var store = new Vuex.Store({
  modules: {
    "channel_list": {
		namespaced: true,
		state: {
			activeList: defaultListType,
			channels: [],
			activeChannel: null,
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
			}
		},
	   	mutations: {
		    RESET_CHANNEL_STATE(state) {
			  Object.assign(state, {
			    activeList: defaultListType,
			    channels: [],
			    invitations: [],
			    activeChannel: null,
			    channelSets: []
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
						prepChannel(channel);
						channel[payload.listType] = true;
						state.channels.push(channel);
					}
				});
			},
			SET_CHANNELSET_LIST(state, channelSets) {
				state.channelSets = channelSets;
			},
			SET_INVITATION_LIST(state, invitations) {
				state.invitations = invitations;
			},
			REMOVE_CHANNELSET(state, channelSet) {
				state.channelSets = _.reject(state.channelSets, (set)=> {
					return set.id === channelSet.id;
				});
			},
			REMOVE_INVITATION(state, invitationID) {
				state.invitations = _.reject(state.invitations, (invitation)=> {
					return invitation.id === invitationID;
				});
			},
			ADD_CHANNEL(state, channel) {
				state.channels.unshift(channel);
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
		    loadChannelSetList: function(context) {
		    	return new Promise((resolve, reject) => {
		    		State.current_user.get_user_channel_collections().then(function(sets){
						context.commit('SET_CHANNELSET_LIST', sets.toJSON());
		    			resolve(sets);
					});
		        });
		    },
		    loadChannelInvitationList: function(context) {
		    	return new Promise((resolve, reject) => {
		    		State.current_user.get_pending_invites().then(function(invitations){
						context.commit('SET_INVITATION_LIST', invitations.toJSON());
		    			resolve(invitations);
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
		    },
		    deleteChannelSet: function(context, channelSet) {
		    	new Models.ChannelSetModel(channelSet).destroy({
		    		success: function() {
		    			context.commit('REMOVE_CHANNELSET', channelSet);
		    		}
		    	});
		    },
		    acceptInvitation: function(context, invitation) {
		    	return new Promise((resolve, reject) => {
		    		let invite = new Models.InvitationModel(invitation);
		    		invite.accept_invitation().then((channel) => {
		    			channel = channel.toJSON();
		    			prepChannel(channel);

		    			switch(invitation.share_mode) {
		    				case 'edit':
		    					channel[ListTypes.EDITABLE] = true;
		    					break;
		    				case 'view':
		    					channel[ListTypes.VIEW_ONLY] = true;
		    					break;
		    			}
		    			context.commit('ADD_CHANNEL', channel);
		    			resolve(channel);
		    		}).catch((error)=>{ reject(error.responseText); });
		        });
		    },
		    declineInvitation: function(context, invitation) {
		    	return new Promise((resolve, reject) => {
		    		let invite = new Models.InvitationModel(invitation);
		    		invite.destroy({ success: resolve, error: reject })
		        });
		    }
		}
    }
  }
});

module.exports = store;
