import * as getters from './getters';
import * as actions from './actions';

export default {
  namespaced: true,
  state: () => ({
    selected: [],
  }),
  getters,
  actions,
};
