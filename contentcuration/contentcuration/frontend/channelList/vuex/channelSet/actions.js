import { NOVALUE } from 'shared/constants';
import { ChannelSet } from 'shared/data/resources';

/* CHANNEL SET ACTIONS */
export function loadChannelSetList(context) {
  return ChannelSet.where().then(channelSets => {
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

export function deleteChannelSet(context, channelSetId) {
  return ChannelSet.delete(channelSetId).then(() => {
    context.commit('REMOVE_CHANNELSET', { id: channelSetId });
  });
}

export function createChannelSet(context) {
  const channelSetData = {
    name: '',
    description: '',
    channels: {},
  };
  return ChannelSet.put(channelSetData).then(id => {
    context.commit('ADD_CHANNELSET', {
      id,
      isNew: true,
      ...channelSetData,
    });
    return id;
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

export function addChannels(context, { channelSetId, channelIds }) {
  for (let channelId of channelIds) {
    context.commit('ADD_CHANNEL_TO_CHANNELSET', { channelSetId, channelId });
  }
  return ChannelSet.update(channelSetId, {
    channels: context.state.channelSetsMap[channelSetId].channels,
  });
}

export function removeChannels(context, { channelSetId, channelIds }) {
  for (let channelId of channelIds) {
    context.commit('REMOVE_CHANNEL_FROM_CHANNELSET', { channelSetId, channelId });
  }
  return ChannelSet.update(channelSetId, {
    channels: context.state.channelSetsMap[channelSetId].channels,
  });
}
