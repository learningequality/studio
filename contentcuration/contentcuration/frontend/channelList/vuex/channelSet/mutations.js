import Vue from 'vue';
import { channelSetLastSavedState } from './utils';

/* CHANNEL SET MUTATIONS */
export function SET_CHANNELSET_LIST(state, channelSets) {
  const channelSetsMap = {};
  channelSets.forEach(channelSet => {
    channelSetLastSavedState.storeLastSavedState(channelSet);
    channelSetsMap[channelSet.id] = channelSet;
  });
  state.channelSetsMap = channelSetsMap;
}

export function ADD_CHANNELSET(state, channelSet) {
  channelSetLastSavedState.storeLastSavedState(channelSet);
  state.channelSetsMap = {
    ...state.channelSetsMap,
    [channelSet.id]: channelSet,
  };
}

export function REMOVE_CHANNELSET(state, channelSetId) {
  Vue.delete(state.channelSetsMap, channelSetId);
}

export function UPDATE_CHANNELSET(
  state,
  { id, name = null, description = null, channels = null } = {}
) {
  if (!id) {
    throw ReferenceError('id must be defined to update a channel set');
  }
  const set = state.channelSetsMap[id];
  if (name !== null) {
    set.name = name;
  }
  if (description !== null) {
    set.description = description;
  }
  if (channels !== null) {
    set.channels = channels;
  }
}
