export function invitations(state) {
  return Object.values(state.invitationsMap);
}

export function getInvitation(state) {
  return function (invitationId) {
    return state.invitationsMap[invitationId];
  };
}

export function getChannelDetails(state) {
  return function (channelId) {
    return state.channelDetailsMap[channelId];
  };
}
