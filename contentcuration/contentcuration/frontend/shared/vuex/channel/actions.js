import { channelLastSavedState } from './index';
import { isTempId } from 'shared/utils';
import client from 'shared/client';

/* CHANNEL LIST ACTIONS */
export function loadChannelList(context, payload) {
  const params = payload || {};
  if (payload && payload.listType) {
    params[payload.listType] = true;
  }
  return client.get(window.Urls['channel-list'](), { params }).then(response => {
    const channels = response.data;
    context.commit('ADD_CHANNELS', channels);
    return channels;
  });
}

export function loadChannel(context, id) {
  return client
    .get(window.Urls['channel-detail'](id))
    .then(response => {
      const channel = response.data;
      context.commit('ADD_CHANNEL', channel);
      return channel;
    })
    .catch(() => {
      return;
    });
}

/* CHANNEL EDITOR ACTIONS */
export function saveChannel(context, channelId) {
  if (context.getters.getChannelIsValid(channelId)) {
    const channelData = channelLastSavedState.getUnsavedChanges(
      context.getters.getChannel(channelId)
    );
    if (Object.keys(channelData).length) {
      if (isTempId(channelId)) {
        if (!channelData.editors || channelData.editors.length === 0) {
          channelData.editors = [context.rootGetters.currentUserId];
        }
        delete channelData.id;
        return client.post(window.Urls['channel-list'](), channelData).then(response => {
          const channel = response.data;
          context.commit('ADD_CHANNEL', channel);
          context.commit('REMOVE_CHANNEL', channelId);
          return channel.id;
        });
      }

      return client.patch(window.Urls['channel-detail'](channelId), channelData).then(response => {
        // If successful the data will just be true,
        // so update our last saved state with the current vuex state.
        if (response.data) {
          channelLastSavedState.storeLastSavedState(context.getters.getChannel(channelId));
        }
        return null;
      });
    }
  }
}

export function bookmarkChannel(context, payload) {
  return client
    .patch(window.Urls['channel-detail'](payload.id), { bookmark: payload.bookmark })
    .then(() => {
      context.commit('TOGGLE_BOOKMARK', payload.id);
    });
}

export function deleteChannel(context, channelId) {
  return client.patch(window.Urls['channel-detail'](channelId), { deleted: true }).then(() => {
    context.commit('REMOVE_CHANNEL', channelId);
  });
}
