import * as getters from './getters';
import * as mutations from './mutations';
import * as actions from './actions';
import { TABLE_NAMES, CHANGE_TYPES } from 'shared/data';

export default {
  namespaced: true,
  state: () => {
    let expandedNodes = {};
    // TODO: test performance before adding this in to avoid loading a lot of data at once
    // if (window.sessionStorage) {
    //   expandedNodes = JSON.parse(window.sessionStorage.getItem('expandedNodes') || '{}');
    // }
    return {
      contentNodesMap: {},
      treeNodesMap: {},
      expandedNodes,

      /*
        Making this part of the vuex store as it seems like the cleanest solution for
        managing moving nodes. Alternative solutions are:
        - Using router to keep track of ids (too easy to hack url or too many validation cases)
        - Adding component for every move option (too many instances of move modal everywhere)
      */
      moveNodes: [],

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
