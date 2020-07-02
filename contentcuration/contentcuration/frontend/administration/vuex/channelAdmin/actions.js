import map from 'lodash/map';
import { Channel } from 'shared/data/resources';

export function loadChannels({ commit }, params) {
  params.deleted = Boolean(params.deleted) && params.deleted.toString() === 'true';

  return Channel.searchAdminChannelList(params).then(pageData => {
    commit('SET_PAGE_DATA', pageData);
    commit('channel/ADD_CHANNELS', pageData.results, { root: true });
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
  return Promise.resolve().then(() => {
    commit('REMOVE_CHANNEL', id);
    commit('channel/REMOVE_CHANNEL', { id }, { root: true });
  });
}
