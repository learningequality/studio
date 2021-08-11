import client from 'shared/client';
import { NOVALUE, ChannelListTypes } from 'shared/constants';

import { Channel, SavedSearch } from 'shared/data/resources';

export function fetchResourceSearchResults(context, params) {
  params = { ...params };
  delete params['last'];
  params.page_size = params.page_size || 25;
  params.channel_list = params.channel_list || ChannelListTypes.PUBLIC;
  return client.get(window.Urls.search_list(), { params }).then(response => {
    context.commit('contentNode/ADD_CONTENTNODES', response.data.results, { root: true });
    return response.data;
  });
}

export function loadChannels(context, params) {
  // Used for search channel filter dropdown
  params.page_size = 25;
  return Channel.fetchCollection({ deleted: false, ...params }).then(channelPage => {
    return channelPage;
  });
}

/* SAVED SEARCH ACTIONS */

export function loadSavedSearches({ commit }) {
  return SavedSearch.where().then(searches => {
    commit('SET_SAVEDSEARCHES', searches);
    return searches;
  });
}

export function createSearch({ commit, rootState }, params) {
  const data = {
    params,
    name: params.keywords,
    saved_by: rootState.session.currentUser.id,
    created: new Date(),
  };
  return SavedSearch.put(data).then(id => {
    commit('UPDATE_SAVEDSEARCH', {
      id,
      ...data,
    });
    return id;
  });
}

export function updateSearch({ commit }, { id, name = NOVALUE } = {}) {
  const searchData = {};
  if (!id) {
    throw ReferenceError('id must be defined to update a saved search');
  }
  if (name !== NOVALUE) {
    searchData.name = name;
  }
  commit('UPDATE_SAVEDSEARCH', { id, ...searchData });
  return SavedSearch.update(id, searchData);
}

export function deleteSearch({ commit }, searchId) {
  return SavedSearch.delete(searchId).then(() => {
    commit('REMOVE_SAVEDSEARCH', searchId);
    return searchId;
  });
}
