import * as getters from './getters';
import * as mutations from './mutations';
import * as actions from './actions';
import { lastSavedStateFactory } from 'shared/utils';

export const channelLastSavedState = lastSavedStateFactory();

export default {
  namespaced: true,
  state: () => ({
    channelsMap: {},
  }),
  getters,
  mutations,
  actions,
};
