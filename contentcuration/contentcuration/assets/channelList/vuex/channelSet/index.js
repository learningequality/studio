import { PageTypes } from '../../constants';
import * as mutations from './mutations';
import * as actions from './actions';
import * as getters from './getters';


export default {
  namespaced: true,
  state: {
    channelSetsMap: {},
  },
  actions,
  mutations,
  getters,
};
