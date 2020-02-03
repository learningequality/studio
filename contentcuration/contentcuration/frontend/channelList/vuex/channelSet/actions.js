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
      context.commit('SET_CHANNELSET_LIST', [channelSet]);
      return channelSet;
    })
    .catch(() => {
      return;
    });
}

export function deleteChannelSet(context, channelSetId) {
  return ChannelSet.delete(channelSetId).then(() => {
    context.commit('REMOVE_CHANNELSET', channelSetId);
  });
}

export function createChannelSet(context) {
  const channelSetData = {
    name: '',
    description: '',
    channels: [],
  };
  return ChannelSet.put(channelSetData).then(id => {
    context.commit('ADD_CHANNELSET', {
      id,
      ...channelSetData,
    });
    return id;
  });
}

export function updateChannelSet(
  context,
  { id, name = NOVALUE, description = NOVALUE, channels = NOVALUE } = {}
) {
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
  if (channels !== NOVALUE) {
    channelSetData.channels = channels;
  }
  context.commit('UPDATE_CHANNELSET', { id, ...channelSetData });
  return ChannelSet.update(id, channelSetData);
}
