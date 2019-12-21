import { lastSavedStateFactory } from '../../utils';
import * as getters from './getters';
import * as mutations from './mutations';
import * as actions from './actions';

export const channelLastSavedState = lastSavedStateFactory();

export default {
  namespaced: true,
  state: () => ({
    channelsMap: {},
    channelDetailsMap: {},
    invitationsMap: {},
    catalogPage: {},
  }),
  getters,
  mutations,
  actions,
};
