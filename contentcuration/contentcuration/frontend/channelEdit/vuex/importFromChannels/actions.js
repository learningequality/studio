import partition from 'lodash/partition';
import { ImportSearchPageSize } from '../../constants';
import client from 'shared/client';
import urls from 'shared/urls';
import { ChannelListTypes } from 'shared/constants';

import { Channel, Recommendation, SavedSearch } from 'shared/data/resources';
import { FeedbackEventTypes, sendRequest } from 'shared/feedbackApiUtils';

export async function fetchResourceSearchResults(context, params) {
  params = { ...params };
  delete params['last'];
  params.page_size = params.page_size || ImportSearchPageSize;
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
        { root: true },
      )
    : Promise.resolve([]);

  const [privateNodesLoaded, publicNodesLoaded] = await Promise.all([
    // the loadContentNodes action already loads the nodes into vuex
    privatePromise,
    Promise.all(
      // The public API is cached, so we can hopefully call it multiple times without
      // worrying too much about performance
      publicNodes.map(node => {
        return context
          .dispatch(
            'contentNode/loadPublicContentNode',
            {
              id: node.id,
              nodeId: node.node_id,
              rootId: node.root_id,
              parent: node.parent,
            },
            { root: true },
          )
          .catch(() => null);
      }),
    ).then(nodes => nodes.filter(Boolean)),
  ]);

  // In case we failed to obtain data for all nodes, filter out the ones we didn't get
  const results = response.data.results
    .map(node => {
      return (
        privateNodesLoaded.find(n => n.id === node.id) ||
        publicNodesLoaded.find(n => n.id === node.id)
      );
    })
    .filter(Boolean);
  // This won't work across multiple pages, if we fail to load some nodes, but that should be rare
  const countDiff = response.data.results.length - results.length;
  const count = response.data.count - countDiff;
  const pageDiff = Math.floor(countDiff / params.page_size);

  return {
    count,
    page: response.data.page,
    results,
    total_pages: response.data.total_pages - pageDiff,
  };
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

export function deleteSearch({ commit }, searchId) {
  return SavedSearch.delete(searchId).then(() => {
    commit('REMOVE_SAVEDSEARCH', searchId);
    return searchId;
  });
}

export function fetchRecommendations(context, params) {
  return Recommendation.fetchCollection(params);
}

export function setRecommendationsData(context, data) {
  context.commit('SET_RECOMMENDATIONS_DATA', data);
}

export async function captureFeedbackEvent(context, params = {}) {
  /**
   * Captures a feedback event based on the provided parameters.
   *
   * @param {Object} context - The Vuex context object.
   * @param {Object} params - Parameters for the feedback event.
   * @param {string} params.event - The type of event ('flag', 'recommendations', 'interaction').
   * @param {string} [params.method='post'] - The HTTP method for request ('post', 'put', 'patch').
   * @param {Object|Array} params.data - The event data. It can be an object or an array of objects.
   * @param {string} [params.eventId] - The unique ID of an event.
   * @throws {Error} If the event is invalid or not provided.
   * @returns {Promise<Object>} A promise that resolves to the response data from the API.
   */
  const event = params.event;
  const method = params.method;
  const eventId = params.eventId;
  const rawData = params.data;
  const isDataArray = Array.isArray(rawData);
  const isDataObject = rawData && typeof rawData === 'object';

  if (!event || !FeedbackEventTypes[event]) {
    throw new Error(
      `Invalid event: '${event}'. Event must be provided and be one of the valid FeedbackEventTypes.`,
    );
  }

  const dataObject = item => ({
    recommendation_event_id: item.recommendation_event_id,
    contentnode_id: item.contentnode_id,
    content_id: item.content_id,
    target_channel_id: item.target_channel_id,
    user: item.user,
    content: item.content,
    context: item.context,
    feedback_type: item.feedback_type,
    feedback_reason: item.feedback_reason,
  });
  const data = isDataArray ? rawData.map(dataObject) : isDataObject ? dataObject(rawData) : {};
  try {
    return await sendRequest(new FeedbackEventTypes[event]({ method, data, eventId }));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error capturing feedback event:', error);
    // Return null if the request fails, to avoid breaking the application
    return null;
  }
}
