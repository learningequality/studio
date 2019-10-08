import * as mutations from './mutations';
import * as actions from './actions';
import * as getters from './getters';
import { lastSavedStateFactory } from '../../utils';

export const channelSetLastSavedState = lastSavedStateFactory();

export default {
  namespaced: true,
  state: () => ({
    channelSetsMap: {},
  }),
  actions,
  mutations,
  getters,
};
