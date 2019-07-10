import { isTempId } from '../../utils';
import { channelSetLastSavedState } from './index';

export function channelSets(state) {
  return Object.values(state.channelSetsMap).filter(set => !isTempId(set.id));
}

export function getChannelSet(state) {
  return function(channelSetId) {
    return state.channelSetsMap[channelSetId];
  };
}

export function getChannelSetIsDirty(state) {
  return function(channelSetId) {
    const set = state.channelSetsMap[channelSetId];
    return set ? channelSetLastSavedState.hasUnsavedChanges(set) : false;
  };
}

export function getChannelSetIsValid(state) {
  return function(channelSetId) {
    const set = state.channelSetsMap[channelSetId];
    return set && set.name && set.name.length > 0;
  };
}
