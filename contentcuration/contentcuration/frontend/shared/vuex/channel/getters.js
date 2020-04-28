import { SharingPermissions } from 'shared/constants';

export function channels(state) {
  return Object.values(state.channelsMap);
}

export function getChannel(state) {
  return function(channelId) {
    return state.channelsMap[channelId];
  };
}

export function getChannels(state) {
  return function(channelIds) {
    return channelIds.map(key => state.channelsMap[key]).filter(channel => channel);
  };
}

export function getChannelIsValid(state) {
  return function(channelId) {
    const channel = state.channelsMap[channelId];
    return channel && channel.name && channel.name.length > 0;
  };
}

export function getChannelUsers(state) {
  return function(channelId, shareMode = SharingPermissions.VIEW_ONLY) {
    if (shareMode === SharingPermissions.EDIT) {
      return state.channelsMap[channelId].editors
        .map(userId => state.usersMap[userId])
        .filter(u => u);
    }
    return state.channelsMap[channelId].viewers
      .map(userId => state.usersMap[userId])
      .filter(u => u);
  };
}

export function getInvitation(state) {
  return function(invitationId) {
    return state.invitationsMap[invitationId];
  };
}

export function getChannelInvitations(state) {
  return function(channelId, shareMode = SharingPermissions.VIEW_ONLY) {
    return Object.values(state.invitationsMap).filter(
      invitation => invitation.channel === channelId && invitation.share_mode === shareMode
    );
  };
}

export function checkUsers(state) {
  return function(channelId, email) {
    return Object.values(SharingPermissions).some(shareMode =>
      getChannelUsers(state)(channelId, shareMode).some(
        user => user && user.email.toLowerCase() === email.toLowerCase()
      )
    );
  };
}

export function checkInvitations(state) {
  return function(channelId, email) {
    return Object.values(state.invitationsMap).some(
      invitation => invitation.channel === channelId && invitation.email === email
    );
  };
}
