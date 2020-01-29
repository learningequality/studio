import { isTempId } from '../../utils';
import { channelSetLastSavedState } from './utils';
import client from 'shared/client';

/* CHANNEL SET ACTIONS */
export function loadChannelSetList(context) {
  return client.get(window.Urls['channelset-list']()).then(response => {
    const channelSets = response.data;
    context.commit('SET_CHANNELSET_LIST', channelSets);
    return channelSets;
  });
}

export function loadChannelSet(context, id) {
  return client
    .get(window.Urls['channelset-detail'](id))
    .then(response => {
      const channelSet = response.data;
      context.commit('SET_CHANNELSET_LIST', [channelSet]);
      return channelSet;
    })
    .catch(() => {
      return;
    });
}

export function deleteChannelSet(context, channelSetId) {
  return client.delete(window.Urls['channelset-detail'](channelSetId)).then(() => {
    context.commit('REMOVE_CHANNELSET', channelSetId);
  });
}

export function saveChannelSet(context, channelSetId) {
  if (context.getters.getChannelSetIsValid(channelSetId)) {
    const channelSetData = channelSetLastSavedState.getUnsavedChanges(
      context.getters.getChannelSet(channelSetId)
    );
    if (Object.keys(channelSetData).length) {
      if (isTempId(channelSetId)) {
        if (!channelSetData.editors || channelSetData.editors.length === 0) {
          channelSetData.editors = [context.rootGetters.currentUserId];
        }
        delete channelSetData.id;
        return client.post(window.Urls['channelset-list'](), channelSetData).then(response => {
          const channelSet = response.data;
          context.commit('ADD_CHANNELSET', channelSet);
          context.commit('REMOVE_CHANNELSET', channelSetId);
          return channelSet.id;
        });
      }

      return client
        .patch(window.Urls['channelset-detail'](channelSetId), channelSetData)
        .then(response => {
          if (response.data) {
            channelSetLastSavedState.storeLastSavedState(
              context.getters.getChannelSet(channelSetId)
            );
          }
          return null;
        });
    }
  }
}
