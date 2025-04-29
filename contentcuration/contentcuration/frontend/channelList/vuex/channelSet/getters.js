export function channelSets(state) {
  return Object.values(state.channelSetsMap);
}

export function getChannelSet(state) {
  return function (channelSetId) {
    const channelSet = state.channelSetsMap[channelSetId];
    if (channelSet) {
      return {
        ...channelSet,
        channels: Object.keys(channelSet.channels || {}),
      };
    }
    return;
  };
}

export function getChannelSetIsValid(state) {
  return function (channelSetId) {
    const set = state.channelSetsMap[channelSetId];
    return set && set.name && set.name.length > 0;
  };
}
