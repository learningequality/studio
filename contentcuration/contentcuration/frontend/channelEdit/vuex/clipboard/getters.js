export function channelIds(state, getters, rootState, rootGetters) {
  const rootId = rootGetters['clipboardRootId'];
  return rootGetters['contentNode/getTreeNodeChildren'](rootId).reduce((channelIds, rootNode) => {
    if (channelIds.indexOf(rootNode.channel_id) === -1) {
      channelIds.push(rootNode.channel_id);
    }
    return channelIds;
  }, []);
}

export function channels(state, getters, rootState, rootGetters) {
  return getters.channelIds.map(channelId => rootGetters['channel/getChannel'](channelId));
}

export function isIndeterminate(state, getters, rootState, rootGetters) {
  return function(id) {
    const descendantIds = rootGetters['contentNode/getTreeNodeDescendants'](id).map(
      node => node.id
    );
    return !!descendantIds.find(id => state.selected.indexOf(id) === -1);
  };
}
