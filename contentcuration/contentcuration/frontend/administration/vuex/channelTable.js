import client from 'shared/client';
import { Channel } from 'shared/data/resources';

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
    channels: state => state.pageData.results,
    totalItems: state => state.pageData.count,
  },
  actions: {
    fetch({ commit }, params) {
      return client.get('/api/get_channels/', { params }).then(response => {
        commit('SET_PAGE_DATA', response.data);
      });
    },
    delete(context, channels) {
      return Channel.modifyByIds(
        channels.map(ch => ch.id),
        { deleted: true }
      );
    },
    restore(context, channels) {
      return Channel.modifyByIds(
        channels.map(ch => ch.id),
        { deleted: false }
      );
    },
  },
};
