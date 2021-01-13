import * as getters from './getters';
import * as mutations from './mutations';
import * as actions from './actions';

export default {
  namespaced: true,
  state: () => ({
    pageData: {
      next: null,
      previous: null,
      page_number: null,
      count: null,
      total_pages: null,
      results: [],
    },
  }),
  getters,
  mutations,
  actions,
};
