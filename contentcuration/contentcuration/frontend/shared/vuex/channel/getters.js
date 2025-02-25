import { SharingPermissions } from 'shared/constants';

function mapChannel(state, channel) {
  return channel
    ? {
        ...channel,
        bookmark: Boolean(state.bookmarksMap[channel.id]),
      }
    : channel;
}

export function channels(state) {
  return Object.values(state.channelsMap).map(channel => mapChannel(state, channel));
}

export function getChannel(state) {
  return function (channelId) {
    return mapChannel(state, state.channelsMap[channelId]);
  };
}

export function getChannels(state) {
  return function (channelIds) {
    return channelIds.map(key => getChannel(state)(key)).filter(channel => channel);
  };
}

export function getBookmarkedChannels(state) {
  return function () {
    return getChannels(state)(Object.keys(state.bookmarksMap));
  };
}

export function getChannelIsValid(state) {
  return function (channelId) {
    const channel = state.channelsMap[channelId];
    return channel && channel.name && channel.name.length > 0;
  };
}

export function getChannelUsers(state) {
  return function (channelId, shareMode = SharingPermissions.VIEW_ONLY) {
    let channelUserIds;
    if (shareMode === SharingPermissions.EDIT) {
      channelUserIds = Object.keys(state.channelEditorsMap[channelId] || {});
    } else {
      channelUserIds = Object.keys(state.channelViewersMap[channelId] || {});
    }
    return channelUserIds.map(id => state.channelUsersMap[id]).filter(Boolean);
  };
}

export function getInvitation(state) {
  return function (invitationId) {
    return state.invitationsMap[invitationId];
  };
}

export function getChannelInvitations(state) {
  return function (channelId, shareMode = SharingPermissions.VIEW_ONLY) {
    return Object.values(state.invitationsMap).filter(
      invitation =>
        invitation.channel === channelId &&
        invitation.share_mode === shareMode &&
        !invitation.accepted &&
        !invitation.declined &&
        !invitation.revoked,
    );
  };
}

export function checkUsers(state) {
  return function (channelId, email) {
    return Object.values(SharingPermissions).some(shareMode =>
      getChannelUsers(state)(channelId, shareMode).some(
        user => user && user.email.toLowerCase() === email.toLowerCase(),
      ),
    );
  };
}

export function checkInvitations(state) {
  return function (channelId, email) {
    return Object.values(state.invitationsMap).some(
      invitation =>
        invitation.channel === channelId &&
        invitation.email.toLowerCase() === email.toLowerCase() &&
        !invitation.revoked &&
        !invitation.declined &&
        !invitation.accepted,
    );
  };
}
