import { lastSavedStateFactory } from '../../utils';
import * as mutations from './mutations';
import * as actions from './actions';
import * as getters from './getters';

export const catalogLastSavedState = lastSavedStateFactory();

export default {
  namespaced: true,
  state: () => ({
    catalogMap: {},
    page: {},
  }),
  actions,
  mutations,
  getters,
};
