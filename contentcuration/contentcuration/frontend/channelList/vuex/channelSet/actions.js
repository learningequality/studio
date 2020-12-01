import { NOVALUE } from 'shared/constants';
import { ChannelSet } from 'shared/data/resources';

/* CHANNEL SET ACTIONS */
export function loadChannelSetList(context) {
  return ChannelSet.where({ editors: context.rootGetters.currentUserId }).then(channelSets => {
    context.commit('SET_CHANNELSET_LIST', channelSets);
    return channelSets;
  });
}

export function loadChannelSet(context, id) {
  return ChannelSet.get(id)
    .then(channelSet => {
      context.commit('ADD_CHANNELSET', channelSet);
      return channelSet;
    })
    .catch(() => {
      return;
    });
}

export function deleteChannelSet(context, channelSet) {
  return ChannelSet.delete(channelSet.id).then(() => {
    context.commit('REMOVE_CHANNELSET', { id: channelSet.id });
  });
}

export function createChannelSet(context) {
  const channelSetData = {
    name: '',
    description: '',
    channels: {},
  };
  const channelSet = ChannelSet.createObj(channelSetData);
  context.commit('ADD_CHANNELSET', channelSet);
  return channelSet.id;
}

export function commitChannelSet(
  context,
  { id, name = NOVALUE, description = NOVALUE, channels = [] } = {}
) {
  const channelSetData = {};
  if (!id) {
    throw ReferenceError('id must be defined to commit a channel');
  }
  if (name !== NOVALUE) {
    channelSetData.name = name;
  }
  if (description !== NOVALUE) {
    channelSetData.description = description;
  }
  channelSetData.channels = {};
  for (let channel of channels) {
    channelSetData.channels[channel] = true;
  }
  return ChannelSet.createModel(channelSetData).then(data => {
    context.commit('SET_CHANNELSET_NOT_NEW', id);
    context.commit('UPDATE_CHANNELSET', data);
  });
}

export function updateChannelSet(context, { id, name = NOVALUE, description = NOVALUE } = {}) {
  const channelSetData = {};
  if (!id) {
    throw ReferenceError('id must be defined to update a channel');
  }
  if (name !== NOVALUE) {
    channelSetData.name = name;
  }
  if (description !== NOVALUE) {
    channelSetData.description = description;
  }
  context.commit('UPDATE_CHANNELSET', { id, ...channelSetData });
  return ChannelSet.update(id, channelSetData);
}

export function addChannels(context, { channelSetId, channelIds = [] } = {}) {
  const updates = {};
  for (let channelId of channelIds) {
    context.commit('ADD_CHANNEL_TO_CHANNELSET', { channelSetId, channelId });
    updates[`channels.${channelId}`] = true;
  }
  return ChannelSet.update(channelSetId, updates);
}

export function removeChannels(context, { channelSetId, channelIds = [] } = {}) {
  const updates = {};
  for (let channelId of channelIds) {
    context.commit('REMOVE_CHANNEL_FROM_CHANNELSET', { channelSetId, channelId });
    updates[`channels.${channelId}`] = undefined;
  }
  return ChannelSet.update(channelSetId, updates);
}
