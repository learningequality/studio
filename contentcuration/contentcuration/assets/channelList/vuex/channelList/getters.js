import omit from 'lodash/omit';
import isEqual from 'lodash/isEqual';
import { isDirty, isDummyId } from '../../utils';

export function channels(state) {
  return Object.values(state.channelsMap).filter(channel => !isDummyId(channel.id));
}

export function invitations(state) {
  return Object.values(state.invitationsMap);
}

export function getChannel(state) {
  return function(channelId) {
    return state.channelsMap[channelId];
  };
}

export function getChannelIsDirty(state) {
  return function(channelId) {
    const channel = state.channelsMap[channelId];
    return channel ? isDirty(channel) : false;
  };
}

export function getChannelIsValid(state) {
  return function(channelId) {
    const channel = state.channelsMap[channelId];
    return channel && channel.name && channel.name.length > 0;
  };
}

export function getInvitation(state) {
  return function(invitationId) {
    return state.invitationsMap[invitationId];
  };
}
