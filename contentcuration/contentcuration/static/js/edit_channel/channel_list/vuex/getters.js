import _ from 'underscore';
import { ListTypes } from '../constants';

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

const omitListTypes = x => _.omit(x, [..._.keys(ListTypes), 'STARRING']);

export function activeChannelHasBeenModified(state) {
  if (!state.activeChannel) {
    return false;
  }
  // List Types are added to Channels Object in the SET_CHANNEL_LIST mutation,
  // so we remove them here before comparing
  return !_.isEqual(omitListTypes(state.channelChanges), omitListTypes(state.activeChannel));
}

export function getChannel(state) {
  return function(channelID) {
    return _.findWhere(state.channels, { id: channelID });
  };
}

export function getInvitation(state) {
  return function(invitationID) {
    return _.findWhere(state.invitations, { id: invitationID });
  };
}

export function getChannelSet(state) {
  return function(channelSetID) {
    return _.findWhere(state.channelSets, { id: channelSetID });
  };
}
