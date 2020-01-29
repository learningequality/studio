import Vue from 'vue';
import map from 'lodash/map';
import { channelLastSavedState } from './utils';
import { ContentDefaults } from 'shared/constants';

/* CHANNEL LIST MUTATIONS */
function mergeChannel(channelsMap, channel) {
  channelLastSavedState.storeLastSavedState(channel);
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

export function SET_PAGE(state, pageData) {
  state.page = pageData;
  ADD_CHANNELS(state, pageData.results);
  state.page.results = map(pageData.results, r => r.id);
}

export function REMOVE_CHANNEL(state, channelId) {
  Vue.delete(state.channelsMap, channelId);
}

export function UPDATE_CHANNEL(
  state,
  {
    id,
    name = null,
    description = null,
    thumbnailData = null,
    language = null,
    content_defaults = {},
  } = {}
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
  if (!channel.content_defaults) {
    channel.content_defaults = {};
  }
  // Assign all acceptable content defaults into the channel defaults
  Object.assign(
    channel.content_defaults,
    Object.entries(content_defaults)
      .filter(([key]) => key in ContentDefaults)
      .reduce((defaults, [key, value]) => ({ ...defaults, [key]: value }), {})
  );
}

export function TOGGLE_BOOKMARK(state, id) {
  state.channelsMap[id].bookmark = !state.channelsMap[id].bookmark;
}

export function ADD_CHANNEL_DETAILS(state, { id, details }) {
  state.channelDetailsMap = {
    ...state.channelDetailsMap,
    [id]: details,
  };
}

export function SET_CATALOG_LIST(state, catalogData) {
  ADD_CHANNELS(state, catalogData.results);
  state.catalogPage = catalogData;
}

/* INVITATION MUTATIONS */
export function SET_INVITATION_LIST(state, invitations) {
  const invitationsMap = {};
  invitations.forEach(invitation => {
    invitationsMap[invitation.id] = {
      ...invitation,
      accepted: false,
      declined: false,
    };
  });
  state.invitationsMap = invitationsMap;
}

export function ACCEPT_INVITATION(state, invitationId) {
  state.invitationsMap[invitationId].accepted = true;
}

export function DECLINE_INVITATION(state, invitationId) {
  state.invitationsMap[invitationId].declined = true;
}

export function REMOVE_INVITATION(state, invitationId) {
  Vue.delete(state.invitationsMap, invitationId);
}
