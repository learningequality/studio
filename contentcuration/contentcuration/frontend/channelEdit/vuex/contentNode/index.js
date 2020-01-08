import * as getters from './getters';
import * as mutations from './mutations';
import * as actions from './actions';
import { lastSavedStateFactory } from 'shared/utils';

export const contentNodeLastSavedState = lastSavedStateFactory();

export default {
  namespaced: true,
  state: () => {
    let expandedNodes = {};
    if (window.sessionStorage) {
      expandedNodes = JSON.parse(window.sessionStorage.getItem('expandedNodes') || '{}');
    }
    return {
      contentNodesMap: {},
      expandedNodes,
    }
  },
  getters,
  mutations,
  actions,
};
