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
    fetch({ commit }, { page, rowsPerPage }) {
      return client
        .get('/api/get_channels/', {
          params: { page, page_size: rowsPerPage },
        })
        .then(response => {
          commit('STORE_PAGE_DATA', response.data);
        });
    },
  },
};
