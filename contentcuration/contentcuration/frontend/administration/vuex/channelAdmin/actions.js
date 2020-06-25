import { Channel } from 'shared/data/resources';

export function loadChannels({ commit }, params) {
  params.deleted = Boolean(params.deleted) && params.deleted.toString() === 'true';

  return Channel.searchAdminChannelList(params).then(pageData => {
    commit('SET_PAGE_DATA', pageData);
    commit('channel/ADD_CHANNELS', pageData.results, { root: true });
  });
}

export function deleteChannel(context, channelIds) {
  return Channel.modifyByIds(channelIds, { deleted: true });
}

export function restoreChannel(context, channelIds) {
  return Channel.modifyByIds(channelIds, { deleted: false });
}
