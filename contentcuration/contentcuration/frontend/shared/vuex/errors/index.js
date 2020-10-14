import { ErrorTypes } from 'shared/constants';
import client from 'shared/client';

// If an Axios error results from calling any of these endpoints,
// we assume we want to show a "Channel Not Found" page
const channelResourceUrls = ['/api/get_channel_details', '/api/channel'];

function normalizeAxiosError(error) {
  let errorType;
  const { config, status } = error.response;

  if (status === 404) {
    const channelUrlMatch = channelResourceUrls.find(url => config.url.includes(url));
    if (channelUrlMatch) {
      errorType = ErrorTypes.CHANNEL_NOT_FOUND;
    } else {
      errorType = ErrorTypes.PAGE_NOT_FOUND;
    }
  } else if (status === 401) {
    errorType = ErrorTypes.UNAUTHORIZED;
  } else {
    errorType = ErrorTypes.UNKNOWN_ERROR;
  }

  return {
    errorType,
    errorText: JSON.stringify(error.response, null, 2),
  };
}

export default {
  namespaced: true,
  state: {
    fullPageError: null, // must have shape { errorType, errorText }
  },
  actions: {
    // Dispatch this action only in the catch branch of an axios request
    handleAxiosError(store, axiosError) {
      store.commit('SET_FULL_PAGE_ERROR', normalizeAxiosError(axiosError));
    },
    // Dispatch this action if the error is an arbitrary Error or object not from axios
    handleGenericError(store, genericError) {
      store.commit('SET_FULL_PAGE_ERROR', {
        errorType: genericError.errorType || ErrorTypes.UNKNOWN_ERROR,
        errorText: genericError.errorText || 'Unknown error',
      });
    },
    clearError(store) {
      store.commit('SET_FULL_PAGE_ERROR', null);
    },
    resetState(store) {
      if (store.state.fullPageError) {
        store.dispatch('clearError');
      }
    },
    submitFeedback(store, feedback) {
      return client.post(window.Urls.submit_feedback(), { feedback });
    },
  },
  mutations: {
    SET_FULL_PAGE_ERROR(state, error) {
      state.fullPageError = error;
    },
  },
};
