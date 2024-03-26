import Vue from 'vue';
import isEmpty from 'lodash/isEmpty';
import { NEW_OBJECT } from 'shared/constants';
import { mergeMapItem } from 'shared/vuex/utils';
import { applyMods } from 'shared/data/applyRemoteChanges';

export function ADD_CONTENTNODE(state, contentNode) {
  state.contentNodesMap = mergeMapItem(state.contentNodesMap, contentNode);
}

export function ADD_CONTENTNODES(state, contentNodes = []) {
  for (const contentNode of contentNodes) {
    ADD_CONTENTNODE(state, contentNode);
  }
}

export function UPDATE_CONTENTNODE_FROM_INDEXEDDB(state, { id, ...updates }) {
  if (id && state.contentNodesMap[id]) {
    // Need to do object spread to return a new object for setting in the map
    // otherwise nested changes will not trigger reactive updates
    Vue.set(state.contentNodesMap, id, { ...applyMods(state.contentNodesMap[id], updates) });
  }
}

export function REMOVE_CONTENTNODE(state, contentNode) {
  Vue.delete(state.contentNodesMap, contentNode.id);
}

export function SET_CONTENTNODE_NOT_NEW(state, contentNodeId) {
  if (state.contentNodesMap[contentNodeId]) {
    Vue.delete(state.contentNodesMap[contentNodeId], NEW_OBJECT);
  }
}

export function ENABLE_VALIDATION_ON_NODES(state, ids) {
  ids.forEach(id => {
    SET_CONTENTNODE_NOT_NEW(state, id);
  });
}

export function ADD_TAG(state, { id, tag }) {
  Vue.set(state.contentNodesMap[id].tags, tag, true);
}

export function REMOVE_TAG(state, { id, tag }) {
  Vue.delete(state.contentNodesMap[id].tags, tag);
}

export function SET_FILES(state, { id, files }) {
  Vue.set(state.contentNodesMap[id], 'files', files);
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
 * Remove an entry from the prerequisite mappings.
 */
export function REMOVE_PREVIOUS_STEP(state, { target_node, prerequisite }) {
  Vue.delete(state.nextStepsMap[prerequisite], target_node);
  if (isEmpty(state.nextStepsMap[prerequisite])) {
    Vue.delete(state.nextStepsMap, prerequisite);
  }
  Vue.delete(state.previousStepsMap[target_node], prerequisite);
  if (isEmpty(state.previousStepsMap[target_node])) {
    Vue.delete(state.previousStepsMap, target_node);
  }
}

/**
 * Add an entry to the prerequisite mappings.
 */
export function ADD_PREVIOUS_STEP(state, { target_node, prerequisite }) {
  if (!state.nextStepsMap[prerequisite]) {
    Vue.set(state.nextStepsMap, prerequisite, {});
  }
  Vue.set(state.nextStepsMap[prerequisite], target_node, true);
  if (!state.previousStepsMap[target_node]) {
    Vue.set(state.previousStepsMap, target_node, {});
  }
  Vue.set(state.previousStepsMap[target_node], prerequisite, true);
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
  for (const mapping of mappings) {
    ADD_PREVIOUS_STEP(state, mapping);
  }
}
