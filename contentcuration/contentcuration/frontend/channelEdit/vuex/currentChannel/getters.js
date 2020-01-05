export function currentChannel(state, getters, rootState, rootGetters) {
  return rootGetters['channel/getChannel'](state.currentChannelId);
}

export function canEdit(state, getters) {
  return getters.currentChannel && getters.currentChannel.edit;
}
