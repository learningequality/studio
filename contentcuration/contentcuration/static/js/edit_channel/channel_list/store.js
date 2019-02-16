import Vue from 'vue';
import _ from 'underscore';
import State from 'edit_channel/state';

import Models from 'edit_channel/models';
import { ChannelSetModalView } from 'edit_channel/channel_set/views';


var Vuex = require('vuex');
var { ListTypes, ChannelListUrls } = require('./constants');
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

			/* Channel mutations */
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
			ADD_CHANNEL(state, channel) {
				state.channels.unshift(channel);
			},
			REMOVE_CHANNEL(state, channel) {
				state.channels = _.reject(state.channels, (c) => {
					return c.id === channel.id;
				});
			},

			/* Channel set mutations */
			SET_CHANNELSET_LIST(state, channelSets) {
				state.channelSets = channelSets;
			},
			ADD_CHANNELSET(state, channelSet) {
				state.channelSets.push(channelSet);
			},
			REMOVE_CHANNELSET(state, channelSet) {
				state.channelSets = _.reject(state.channelSets, (set)=> {
					return set.id === channelSet.id;
				});
			},

			/* Invitation mutations */
			SET_INVITATION_LIST(state, invitations) {
				state.invitations = invitations;
			},
			REMOVE_INVITATION(state, invitationID) {
				state.invitations = _.reject(state.invitations, (invitation)=> {
					return invitation.id === invitationID;
				});
			}
  		},
  		actions: {
		    loadChannelList: function(context, listType) {
		    	return new Promise((resolve, reject) => {
		    		$.ajax({
		                method: "GET",
		                url: ChannelListUrls[listType],
		                error: reject,
		                success: (channels) => {
		                	context.commit('SET_CHANNEL_LIST', {
			    				listType: listType,
			    				channels: channels
			    			});
			    			resolve(channels);
		                }
		            });
		        });
		    },
		    loadChannelSetList: function(context) {
		    	return new Promise((resolve, reject) => {
		    		$.ajax({
		                method: "GET",
		                url: window.Urls.get_user_channel_sets(),
		                error: reject,
		                success: (channelSets) => {
		                	context.commit('SET_CHANNELSET_LIST', channelSets);
		    				resolve(channelSets);
		                }
		            });
		        });
		    },
		    loadChannelInvitationList: function(context) {
		    	return new Promise((resolve, reject) => {
		    		$.ajax({
		                method: "GET",
		                url: window.Urls.get_user_pending_channels(),
		                error: reject,
		                success: (invitations) => {
		                	context.commit('SET_INVITATION_LIST', invitations);
		    				resolve(invitations);
		                }
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
		    newChannelSet: function(context) {
		    	/* TODO: REMOVE BACKBONE, move to ChannelSetList.vue */
		    	let channelSetView = new ChannelSetModalView({
					modal: true,
					isNew: true,
					model: new Models.ChannelSetModel(),
					onsave: (channelset)=> {
						context.commit('ADD_CHANNELSET', channelset.toJSON());
					}
				});
		    },
		    openChannelSet: function(context, channelSet) {
		    	/* TODO: REMOVE BACKBONE */
				let channelSetView = new ChannelSetModalView({
					modal: true,
					isNew: false,
					model: new Models.ChannelSetModel(channelSet),
					onsave: (channelset) => {
						_.each(channelset.pairs(), (attr) => {
							channelSet[attr[0]] = attr[1];
						})
					}
				});
			},
		    deleteChannelSet: function(context, channelSet) {
		    	/* TODO: REMOVE BACKBONE */
		    	new Models.ChannelSetModel(channelSet).destroy({
		    		success: function() {
		    			context.commit('REMOVE_CHANNELSET', channelSet);
		    		}
		    	});
		    },
		    acceptInvitation: function(context, invitation) {
		    	return new Promise((resolve, reject) => {
		    		$.ajax({
		                method: "POST",
		                url: window.Urls.accept_channel_invite(),
		                data: { "invitation_id": invitation.id },
		                error: reject,
		                success: (channel) => {
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
		                }
		            });
		        });
		    },
		    declineInvitation: function(context, invitation) {
		    	/* TODO: REMOVE BACKBONE */
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
