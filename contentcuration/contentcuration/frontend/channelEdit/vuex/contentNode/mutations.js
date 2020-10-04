import Vue from 'vue';
import isEmpty from 'lodash/isEmpty';
import { mergeMapItem } from 'shared/vuex/utils';

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

export function ENABLE_VALIDATION_ON_NODES(state, ids) {
  ids.forEach(id => {
    if (state.contentNodesMap[id]) state.contentNodesMap[id].isNew = false;
  });
}

export function ADD_TAG(state, { id, tag }) {
  Vue.set(state.contentNodesMap[id].tags, tag, true);
}

export function REMOVE_TAG(state, { id, tag }) {
  Vue.delete(state.contentNodesMap[id].tags, tag);
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

/**
 * Remove an entry from next steps map.
 */
export function REMOVE_PREVIOUS_STEP(state, { targetId, previousStepId }) {
  Vue.delete(state.nextStepsMap[previousStepId], targetId);
  if (isEmpty(state.nextStepsMap[previousStepId])) {
    Vue.delete(state.nextStepsMap, previousStepId);
  }
  Vue.delete(state.previousStepsMap[targetId], previousStepId);
  if (isEmpty(state.previousStepsMap[targetId])) {
    Vue.delete(state.previousStepsMap, targetId);
  }
}

/**
 * Add an entry to next steps map.
 */
export function ADD_PREVIOUS_STEP(state, { targetId, previousStepId }) {
  if (!state.nextStepsMap[previousStepId]) {
    Vue.set(state.nextStepsMap, previousStepId, {});
  }
  Vue.set(state.nextStepsMap[previousStepId], targetId, true);
  if (!state.previousStepsMap[targetId]) {
    Vue.set(state.previousStepsMap, targetId, {});
  }
  Vue.set(state.previousStepsMap[targetId], previousStepId, true);
}

/**
 * Saves the complete map of previous/next steps (pre/post-requisites)
 * of a node to vuex state.
 * @param {Array[Object]} mapping Requisite mappings as retrieved from API
 *                                      Data format example: [
 *                                        {
 *                                          target_node: 'id-integrals,
 *                                          prerequisite: 'id-math',
 *                                          },
 *                                        ]
 */
export function SAVE_NEXT_STEPS(state, { mappings = [] } = {}) {
  for (let mapping of mappings) {
    ADD_PREVIOUS_STEP(state, {
      targetId: mapping['target_node'],
      previousStepId: mapping['prerequisite'],
    });
  }
}
