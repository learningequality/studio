import * as getters from './getters';
import * as mutations from './mutations';
import * as actions from './actions';
import { lastSavedStateFactory } from 'shared/utils';

export const contentNodeLastSavedState = lastSavedStateFactory();

export default {
  namespaced: true,
  state: () => ({
    contentNodesMap: {},
  }),
  getters,
  mutations,
  actions,
};
