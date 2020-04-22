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
      return Object.values(state.usersMap).filter(user =>
        user.editable_channels.includes(channelId)
      );
    }
    return Object.values(state.usersMap).filter(user =>
      user.view_only_channels.includes(channelId)
    );
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
    return Object.values(state.usersMap).some(
      user =>
        user.email === email &&
        (user.editable_channels.includes(channelId) || user.view_only_channels.includes(channelId))
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
