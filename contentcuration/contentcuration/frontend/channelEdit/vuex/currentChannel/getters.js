export function currentChannel(state, getters, rootState, rootGetters) {
  return rootGetters['channel/getChannel'](state.currentChannelId);
}

export function getCurrentChannelStagingDiff(state) {
  return state.currentChannelStagingDiff;
}

export function canEdit(state, getters) {
  return (
    getters.currentChannel &&
    getters.currentChannel.edit &&
    !getters.currentChannel.ricecooker_version
  );
}

// Allow some extra actions for ricecooker channels
export function canManage(state, getters) {
  return getters.currentChannel && getters.currentChannel.edit;
}

// For the most part, we use !canEdit, but this is a way of
// distinguishing between cases where the channel is public and anyone
// can access it, or cases where the user has explicit view-only access
// to be able to invite other viewers
export function canView(state, getters) {
  return getters.currentChannel && getters.currentChannel.view;
}

export function rootId(state, getters) {
  return getters.currentChannel && getters.currentChannel.root_id;
}

export function trashId(state, getters) {
  return getters.currentChannel && getters.currentChannel.trash_root_id;
}

export function stagingId(state, getters) {
  return getters.currentChannel && getters.currentChannel.staging_root_id;
}

export function hasStagingTree(state, getters) {
  return Boolean(getters.stagingId);
}
