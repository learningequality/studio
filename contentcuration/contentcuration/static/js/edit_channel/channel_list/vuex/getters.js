
import _ from 'underscore';

export function channels(state) {
	return state.channels;
}

export function channelSets(state) {
	return state.channelSets;
}

export function invitations(state) {
	return state.invitations;
}

export function changed(state) {
	return state.changed;
}

export function getChannel(state) {
  return function(channelID) {
  	return _.findWhere(state.channels, {id: channelID});
  };
}

export function getInvitation(state) {
  return function(invitationID) {
  	return _.findWhere(state.invitations, {id: invitationID});
  };
}

export function getChannelSet(state) {
  return function(channelSetID) {
  	return _.findWhere(state.channelSets, {id: channelSetID});
  };
}
