import map from 'lodash/map';
import client from 'shared/client';

export function loadChannels({ commit }, params) {
  params.deleted = Boolean(params.deleted) && params.deleted.toString() === 'true';
  params.page_size = params.page_size || 25;

  return client.get(window.Urls.admin_channels_list(), { params }).then(response => {
    commit('SET_PAGE_DATA', response.data);
    commit('channel/ADD_CHANNELS', response.data.results, { root: true });
  });
}

export function getAdminChannelListDetails({ rootGetters, dispatch }, channelIds = []) {
  const promises = channelIds.map(id => dispatch('channel/loadChannelDetails', id, { root: true }));
  return Promise.all(promises).then(responses => {
    return map(responses, (channel, i) => {
      return {
        ...channel,
        ...rootGetters['channel/getChannel'](channelIds[i]),
      };
    });
  });
}

export function deleteChannel({ commit }, id) {
  return client.delete(window.Urls.admin_channels_detail(id)).then(() => {
    commit('REMOVE_CHANNEL', id);
    commit('channel/REMOVE_CHANNEL', { id }, { root: true });
  });
}
