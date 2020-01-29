import Vue from 'vue';

/* CHANNEL LIST MUTATIONS */
function mergeChannel(channelsMap, channel) {
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

export function UPDATE_CHANNEL(state, { id, ...payload } = {}) {
  if (!id) {
    throw ReferenceError('id must be defined to update a channel');
  }
  state.channelsMap[id] = {
    ...state.channelsMap[id],
    ...payload,
  };
}

export function SET_BOOKMARK(state, { id, bookmark }) {
  state.channelsMap[id].bookmark = bookmark;
}
