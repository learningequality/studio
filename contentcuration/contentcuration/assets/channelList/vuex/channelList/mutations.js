import Vue from 'vue';
import { prepChannel, setDirtyTracking } from '../../utils';

/* CHANNEL LIST MUTATIONS */
function mergeChannel(channelsMap, channel) {
  setDirtyTracking(channel);
  return {
    ...channelsMap,
    [channel.id]: {
      ...channelsMap[channel.id],
      ...channel,
    },
  };
}

export function ADD_CHANNEL(state, channel) {
  state.channelsMap = mergeChannel(state.channelsMap, channel);
}

export function ADD_CHANNELS(state, channels = []) {
  state.channelsMap = channels.reduce((channelsMap, channel) => {
    return mergeChannel(channelsMap, channel);
  }, state.channelsMap);
}

export function REMOVE_CHANNEL(state, channelId) {
  Vue.delete(state.channelsMap, channelId);
}

export function UPDATE_CHANNEL(
  state,
  { id, name = null, description = null, thumbnailData = null, language = null } = {}
) {
  if (!id) {
    throw ReferenceError('id must be defined to update a channel set');
  }
  const channel = state.channelsMap[id];
  if (name !== null) {
    channel.name = name;
  }
  if (description !== null) {
    channel.description = description;
  }
  if (
    thumbnailData !== null &&
    ['thumbnail', 'thumbnail_url', 'thumbnail_encoding'].every(attr => thumbnailData[attr])
  ) {
    channel.thumbnail = thumbnailData.thumbnail;
    channel.thumbnail_url = thumbnailData.thumbnail_url;
    channel.thumbnail_encoding = thumbnailData.thumbnail_encoding;
  }
  if (language !== null) {
    channel.language = language;
  }
}

export function SET_CHANNEL_BOOKMARK(state, { id, bookmark }) {
  state.channelsMap[id].bookmark = bookmark;
}

/* INVITATION MUTATIONS */
export function SET_INVITATION_LIST(state, invitations) {
  const invitationsMap = {};
  invitations.forEach(invitation => {
    setDirtyTracking(invitation);
    invitationsMap[invitation.id] = invitation;
  });
  state.invitationsMap = invitationsMap;
}

export function REMOVE_INVITATION(state, invitationId) {
  delete state.invitationsMap[invitationId];
}
