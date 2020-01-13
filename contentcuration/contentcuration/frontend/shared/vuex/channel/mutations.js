import Vue from 'vue';
import { channelLastSavedState } from './index';
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

export function REMOVE_CHANNEL(state, channel) {
  Vue.delete(state.channelsMap, channel.id);
}

export function UPDATE_CHANNEL(
  state,
  { id, name = null, description = null, thumbnailData = null, language = null, content_defaults = {} } = {}
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
