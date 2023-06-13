import partition from 'lodash/partition';
import client from 'shared/client';
import urls from 'shared/urls';
import * as publicApi from 'shared/data/public';
import { NOVALUE, ChannelListTypes } from 'shared/constants';

import { Channel, SavedSearch } from 'shared/data/resources';

export async function fetchResourceSearchResults(context, params) {
  params = { ...params };
  delete params['last'];
  params.page_size = params.page_size || 25;
  params.channel_list = params.channel_list || ChannelListTypes.PUBLIC;

  const response = await client.get(urls.search_list(), { params });

  // Split nodes into public and private so we can call the separate apis
  const [publicNodes, privateNodes] = partition(response.data.results, node => node.public);

  const privatePromise = privateNodes.length
    ? context.dispatch(
        'contentNode/loadContentNodes',
        {
          id__in: privateNodes.map(node => node.id),
        },
        { root: true }
      )
    : Promise.resolve([]);

  await Promise.all([
    // the loadContentNodes action already loads the nodes into vuex
    privatePromise,
    Promise.all(
      // The public API is cached, so we can hopefully call it multiple times without
      // worrying too much about performance
      publicNodes.map(async node => {
        const publicNode = await publicApi.getContentNode(node.node_id).catch(() => null);
        if (!publicNode) {
          return;
        }
        return publicApi.convertContentNodeResponse(node.id, node.root_id, publicNode);
      })
    )
      .then(nodes => nodes.filter(Boolean))
      .then(nodes => {
        context.commit('contentNode/ADD_CONTENTNODES', nodes, { root: true });
        return nodes;
      }),
  ]);

  return response.data;
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
  return SavedSearch.add(data).then(id => {
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
