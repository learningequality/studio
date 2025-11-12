import map from 'lodash/map';
import client from 'shared/client';
import { NOVALUE } from 'shared/constants';
import { Channel } from 'shared/data/resources';

export function loadChannels({ commit }, params) {
  const extendedParams = {
    ...params,
    page_size: params.page_size || 25,
  };
  
  const isCommunityLibraryFilter = 
    params.has_community_library_submission === true || 
    params.has_community_library_submission === 'true';
  if (!isCommunityLibraryFilter) {
    extendedParams.deleted = Boolean(params.deleted) && params.deleted.toString() === 'true';
  }

  const paramsSerializer = {
    indexes: null, // Handle arrays by providing the same query param multiple times
  };

  return client
    .get(window.Urls.admin_channels_list(), { params: extendedParams, paramsSerializer })
    .then(response => {
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

export function updateChannel(
  context,
  {
    id,
    demo_server_url = NOVALUE,
    source_url = NOVALUE,
    deleted = NOVALUE,
    isPublic = NOVALUE,
  } = {},
) {
  if (context.rootState.channel.channelsMap[id]) {
    const channelData = {};
    if (!id) {
      throw ReferenceError('id must be defined to update a channel');
    }
    if (demo_server_url !== NOVALUE) {
      channelData.demo_server_url = demo_server_url;
    }
    if (source_url !== NOVALUE) {
      channelData.source_url = source_url;
    }
    if (deleted !== NOVALUE) {
      channelData.deleted = deleted;
    }
    if (isPublic !== NOVALUE) {
      channelData.public = isPublic;
    }
    return Channel.updateAsAdmin(id, channelData).then(() => {
      context.commit('channel/UPDATE_CHANNEL', { id, ...channelData }, { root: true });
    });
  }
}
