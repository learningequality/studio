import * as getters from './getters';
import * as mutations from './mutations';
import * as actions from './actions';
import { lastSavedStateFactory } from '../../utils';

export const channelLastSavedState = lastSavedStateFactory();

export default {
  namespaced: true,
  state: {
    channelsMap: {},
    channelDetailsMap: {},
    invitationsMap: {},
  },
  getters,
  mutations,
  actions,
};
