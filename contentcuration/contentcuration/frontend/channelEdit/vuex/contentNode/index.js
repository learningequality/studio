import * as getters from './getters';
import * as mutations from './mutations';
import * as actions from './actions';
import { TABLE_NAMES, CHANGE_TYPES } from 'shared/data';

export default {
  namespaced: true,
  state: () => {
    let expandedNodes = {};
    if (window.sessionStorage) {
      expandedNodes = JSON.parse(window.sessionStorage.getItem('expandedNodes') || '{}');
    }
    return {
      contentNodesMap: {},
      treeNodesMap: {},
      expandedNodes,
      /**
       * A map of nodes ids where keys are target ids
       * and values are ids of their next steps
       *
       * E.g. Reading -> Math -> Integrals -> Physics
       * would be represented here as
       * [
       *   ['id-reading', 'id-math'],
       *   ['id-math', 'id-integrals'],
       *   ['id-integrals', 'id-physics']
       * ]
       */
      nextStepsMap: [],
    };
  },
  getters,
  mutations,
  actions,
  listeners: {
    [TABLE_NAMES.CONTENTNODE]: {
      [CHANGE_TYPES.CREATED]: 'ADD_CONTENTNODE',
      [CHANGE_TYPES.UPDATED]: 'UPDATE_CONTENTNODE',
      [CHANGE_TYPES.DELETED]: 'REMOVE_CONTENTNODE',
    },
    [TABLE_NAMES.TREE]: {
      [CHANGE_TYPES.CREATED]: 'ADD_TREENODE',
      [CHANGE_TYPES.UPDATED]: 'UPDATE_TREENODE',
      [CHANGE_TYPES.DELETED]: 'REMOVE_TREENODE',
    },
  },
};
