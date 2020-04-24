import client from 'shared/client';

export default {
  namespaced: true,
  state: () => ({
    pageData: {},
  }),
  mutations: {
    STORE_PAGE_DATA(state, responseData) {
      state.pageData = responseData;
    },
  },
  getters: {
    channels: state => state.pageData.results,
    totalItems: state => state.pageData.count,
  },
  actions: {
    fetch({ commit }, params) {
      return client.get('/api/get_channels/', { params }).then(response => {
        commit('STORE_PAGE_DATA', response.data);
      });
    },
  },
};
