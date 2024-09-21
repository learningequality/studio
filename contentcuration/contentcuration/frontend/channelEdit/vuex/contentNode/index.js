import * as getters from './getters';
import * as mutations from './mutations';
import * as actions from './actions';
import { TABLE_NAMES, CHANGE_TYPES } from 'shared/data';

export default {
  namespaced: true,
  state: () => {
    const expandedNodes = {};
    // TODO: test performance before adding this in to avoid loading a lot of data at once
    // if (window.sessionStorage) {
    //   expandedNodes = JSON.parse(window.sessionStorage.getItem('expandedNodes') || '{}');
    // }
    return {
      contentNodesMap: {},
      expandedNodes,

      /**
       * Object to store information about the current quick edit modal opened.
       * Making this part of the vuex store as the quick edit modal can be opened
       * from multiple places and deep in the tree.
       *
       * This object contains the following properties:
       * - nodeIds: the ids of the nodes to be edited
       * - modal: The name of the quick edit modal being
       *          opened (from the "QuickEditModals" object in constants.js)
       */
      quickEditModalOpen: null,

      /*
        Making this part of the vuex store as it seems like the cleanest solution for
        managing moving nodes. Alternative solutions are:
        - Using router to keep track of ids (too easy to hack url or too many validation cases)
        - Adding component for every move option (too many instances of move modal everywhere)
      */
      moveNodes: [],

      /*
        Adding this to the vuex store to only need to manage ancestor inheritance
        in the edit modal, and in the topic view. This state is only used for topic view handling,
        so that node moving, and copying both trigger in the inheritance logic,
        via the multiple means that these can all be triggered.
      */
      inheritingNodes: null,
      /**
       * Here we denormalize our prerequisite data in order to
       * allow simple forwards/backwards lookups in our graph
       * the mutations that add and remove nodes from the prerequisite
       * structure maintain these two maps in parallel.
       */

      /**
       * A map of nodes ids where keys are prerequisite ids
       * and keys of the child map are ids of their target nodes
       *
       * E.g. Reading -> Math -> Integrals -> Physics
       * would be represented here as
       * {
       *   'id-reading': { 'id-math': true },
       *   'id-math': { 'id-integrals': true },
       *   'id-integrals': { 'id-physics': true },
       * }
       */
      nextStepsMap: {},
      /**
       * A map of nodes ids where keys are targt node ids
       * and keys of the child map are ids of the prerequisite nodes
       *
       * E.g. Reading -> Math -> Integrals -> Physics
       * would be represented here as
       * {
       *   'id-math': { 'id-reading': true },
       *   'id-integrals': { 'id-math': true },
       *   'id-physics': { 'id-integrals': true },
       * }
       */
      previousStepsMap: {},

      /**
       * A map of node ids to their respective resource or assessment item nodes counts.
       *
       * For example,
       * {
       *   '<content_node_id_1>': { 'resourceCount': 2  }
       *   '<content_node_id_2>': { 'assessmentItemCount': 1  }
       * }
       */
      contentNodesCountMap: {},
    };
  },
  getters,
  mutations,
  actions,
  listeners: {
    [TABLE_NAMES.CONTENTNODE]: {
      [CHANGE_TYPES.CREATED]: 'ADD_CONTENTNODE',
      [CHANGE_TYPES.UPDATED]: 'UPDATE_CONTENTNODE_FROM_INDEXEDDB',
      [CHANGE_TYPES.DELETED]: 'REMOVE_CONTENTNODE',
    },
    [TABLE_NAMES.CONTENTNODE_PREREQUISITE]: {
      [CHANGE_TYPES.CREATED]: 'ADD_PREVIOUS_STEP',
      [CHANGE_TYPES.DELETED]: 'REMOVE_PREVIOUS_STEP',
    },
  },
};
