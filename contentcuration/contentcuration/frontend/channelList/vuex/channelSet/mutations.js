import Vue, { set } from 'vue';
import { NEW_OBJECT } from 'shared/constants';
import { applyMods } from 'shared/data/applyRemoteChanges';

/* CHANNEL SET MUTATIONS */
export function SET_CHANNELSET_LIST(state, channelSets) {
  const channelSetsMap = {};
  channelSets.forEach(channelSet => {
    channelSetsMap[channelSet.id] = channelSet;
  });
  state.channelSetsMap = channelSetsMap;
}

export function ADD_CHANNELSET(state, channelSet) {
  state.channelSetsMap = {
    ...state.channelSetsMap,
    [channelSet.id]: channelSet,
  };
}

export function REMOVE_CHANNELSET(state, channelSet) {
  Vue.delete(state.channelSetsMap, channelSet.id);
}

export function UPDATE_CHANNELSET(state, { id, ...payload }) {
  if (!id) {
    throw ReferenceError('id must be defined to update a channel set');
  }
  state.channelSetsMap[id] = {
    ...state.channelSetsMap[id],
    ...payload,
  };
}

export function UPDATE_CHANNELSET_FROM_INDEXEDDB(state, { id, ...mods }) {
  if (id && state.channelSetsMap[id]) {
    set(state.channelSetsMap, id, { ...applyMods(state.channelSetsMap[id], mods) });
  }
}

export function ADD_CHANNEL_TO_CHANNELSET(state, { channelSetId, channelId }) {
  set(state.channelSetsMap[channelSetId].channels, channelId, true);
}

export function REMOVE_CHANNEL_FROM_CHANNELSET(state, { channelSetId, channelId }) {
  Vue.delete(state.channelSetsMap[channelSetId].channels, channelId);
}

export function SET_CHANNELSET_NOT_NEW(state, channelSetId) {
  if (state.channelSetsMap[channelSetId]) {
    Vue.delete(state.channelSetsMap[channelSetId], NEW_OBJECT);
  }
}
