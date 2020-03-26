import Vue from 'vue';
import { mergeMapItem } from 'shared/vuex/utils';
import { removeDuplicatePairs } from 'shared/utils';

export function ADD_CONTENTNODE(state, contentNode) {
  state.contentNodesMap = mergeMapItem(state.contentNodesMap, contentNode);
}

export function ADD_CONTENTNODES(state, contentNodes = []) {
  state.contentNodesMap = contentNodes.reduce((contentNodesMap, contentNode) => {
    return mergeMapItem(contentNodesMap, contentNode);
  }, state.contentNodesMap);
}

export function REMOVE_CONTENTNODE(state, contentNode) {
  Vue.delete(state.contentNodesMap, contentNode.id);
}

export function UPDATE_CONTENTNODE(state, { id, ...payload } = {}) {
  if (!id) {
    throw ReferenceError('id must be defined to update a contentNode set');
  }
  state.contentNodesMap[id] = {
    ...state.contentNodesMap[id],
    ...payload,
  };
}

export function UPDATE_CONTENTNODES(state, { ids, ...payload }) {
  ids.forEach(id => {
    UPDATE_CONTENTNODE(state, {
      id,
      ...payload,
    });
  });
}

export function ENABLE_VALIDATION_ON_NODES(state, ids) {
  ids.forEach(id => {
    if (state.contentNodesMap[id]) state.contentNodesMap[id].isNew = false;
  });
}

export function SET_TAGS(state, { id, tags }) {
  state.contentNodesMap[id].tags = tags;
}

export function SET_FILES(state, { id, files }) {
  state.contentNodesMap[id].files = files;
}

export function COLLAPSE_ALL_EXPANDED(state) {
  state.expandedNodes = {};
}

export function SET_EXPANSION(state, { id, expanded }) {
  if (!expanded) {
    Vue.delete(state.expandedNodes, id);
  } else {
    Vue.set(state.expandedNodes, id, true);
  }
  // TODO: test performance before adding this in to avoid loading a lot of data at once
  // if (window.sessionStorage) {
  //   window.sessionStorage.setItem('expandedNodes', JSON.stringify(state.expandedNodes));
  // }
}

export function TOGGLE_EXPANSION(state, id) {
  SET_EXPANSION(state, { id, expanded: !state.expandedNodes[id] });
}

export function SET_MOVE_NODES(state, ids) {
  state.moveNodes = ids;
}

export function ADD_TREENODE(state, treeNode) {
  state.treeNodesMap = mergeMapItem(state.treeNodesMap, treeNode);
}

export function ADD_TREENODES(state, treeNodes = []) {
  state.treeNodesMap = treeNodes.reduce((treeNodesMap, treeNode) => {
    return mergeMapItem(treeNodesMap, treeNode);
  }, state.treeNodesMap);
}

export function REMOVE_TREENODE(state, treeNode) {
  Vue.delete(state.treeNodesMap, treeNode.id);
}

export function UPDATE_TREENODE(state, { id, ...payload } = {}) {
  if (!id) {
    throw ReferenceError('id must be defined to update a tree node');
  }
  state.treeNodesMap[id] = {
    ...state.treeNodesMap[id],
    ...payload,
  };
}

/**
 * Saves the complete chain of previous/next steps (pre/post-requisites)
 * of a node to next steps map.
 * @param {String} nodeId Id of a node for which
 * @param {Object} prerequisite_mapping Prerequsite mapping as retrieved from API
 *                                      Data format example: {
 *                                        'id-chemistry': {
 *                                          'id-integrals': {
 *                                             'id-math': {}
 *                                           },
 *                                           'id-reading': {}
 *                                        }
 *                                      }
 * @param {Object} postrequisite_mapping Postrequisite mapping as retrieved from API
 *                                       Check `prerequisite_mapping` to see data format
 */
export function SAVE_NEXT_STEPS(
  state,
  { nodeId, prerequisite_mapping = {}, postrequisite_mapping = {} } = {}
) {
  if (!nodeId) {
    throw ReferenceError('node id must be defined to save its next steps');
  }

  /**
   * Example:
   * Converts {
   *  'id-1': {
   *    'id-2': {
   *      'id-3': {},
   *      'id-4': {}
   *     }
   *   }
   * }
   * to
   * [
   *   ['id-1', 'id-2'],
   *   ['id-2', 'id-3'],
   *   ['id-2', 'id-4']
   * ]
   */
  const deepToPlain = ({ stepKey, steps, accumulator = [] }) => {
    if (!Object.keys(steps) || !Object.keys(steps).length) {
      return accumulator;
    }

    Object.keys(steps).forEach(key => {
      accumulator.push([stepKey, key]);

      deepToPlain({
        stepKey: key,
        steps: steps[key],
        accumulator,
      });
    });
  };

  const plainPreviousSteps = [];
  const plainNextSteps = [];
  deepToPlain({
    stepKey: nodeId,
    steps: prerequisite_mapping,
    accumulator: plainPreviousSteps,
  });
  deepToPlain({
    stepKey: nodeId,
    steps: postrequisite_mapping,
    accumulator: plainNextSteps,
  });

  const nextStepsMap = [
    ...state.nextStepsMap,
    ...plainNextSteps,
    // swap keys with values to convert
    // "target:previous" format to "target:next" format
    ...plainPreviousSteps.map(([step, previousStep]) => [previousStep, step]),
  ];

  state.nextStepsMap = removeDuplicatePairs(nextStepsMap);
}

/**
 * Remove an entry from next steps map.
 */
export function REMOVE_PREVIOUS_STEP(state, { targetId, previousStepId }) {
  state.nextStepsMap = state.nextStepsMap.filter(entry => {
    return !(entry[0] === previousStepId && entry[1] === targetId);
  });
}

/**
 * Add an entry to next steps map.
 */
export function ADD_PREVIOUS_STEP(state, { targetId, previousStepId }) {
  if (
    state.nextStepsMap.find(entry => {
      return entry[0] === previousStepId && entry[1] === targetId;
    })
  ) {
    return;
  }

  state.nextStepsMap = [...state.nextStepsMap, [previousStepId, targetId]];
}
