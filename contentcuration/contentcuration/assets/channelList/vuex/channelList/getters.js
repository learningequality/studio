import omit from 'lodash/omit';
import isEqual from 'lodash/isEqual';
import { isTempId } from '../../utils';
import { channelLastSavedState } from './index';


export function channels(state) {
  return Object.values(state.channelsMap).filter(channel => !isTempId(channel.id));
}

export function invitations(state) {
  return Object.values(state.invitationsMap);
}

export function getChannel(state) {
  return function(channelId) {
    return state.channelsMap[channelId];
  };
}

export function getChannelUnsaved(state) {
  return function(channelId) {
    const channel = state.channelsMap[channelId];
    return channel ? channelLastSavedState.hasUnsavedChanges(channel) : false;
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
