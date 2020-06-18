import client from 'shared/client';

export default {
  namespaced: true,
  state: () => ({
    pageData: {},
  }),
  mutations: {
    SET_PAGE_DATA(state, responseData) {
      state.pageData = responseData;
    },
  },
  getters: {
    users: state => state.pageData.results,
    totalItems: state => state.pageData.count,
  },
  actions: {
    fetch({ commit }, params) {
      return client.get('/api/get_users/', { params }).then(response => {
        commit('SET_PAGE_DATA', response.data);
      });
    },
  },
};
