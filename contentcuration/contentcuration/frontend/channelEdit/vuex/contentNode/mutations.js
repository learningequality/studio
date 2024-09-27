import Vue from 'vue';
import isEmpty from 'lodash/isEmpty';
import { NEW_OBJECT } from 'shared/constants';
import { mergeMapItem } from 'shared/vuex/utils';
import { cleanBooleanMaps } from 'shared/utils/helpers';
import { applyMods } from 'shared/data/applyRemoteChanges';

export function ADD_CONTENTNODE(state, contentNode) {
  cleanBooleanMaps(contentNode);
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
    const contentNode = { ...applyMods(state.contentNodesMap[id], updates) };
    cleanBooleanMaps(contentNode);
    Vue.set(state.contentNodesMap, id, contentNode);
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

export function ADD_INHERITING_NODE(state, node) {
  state.inheritingNodes = (state.inheritingNodes || []).concat(node);
}

export function CLEAR_INHERITING_NODES(state, ids) {
  if (!state.inheritingNodes) {
    return;
  }
  const nodes = state.inheritingNodes.filter(n => !ids.includes(n.id));
  state.inheritingNodes = nodes.length ? nodes : null;
}

export function SET_QUICK_EDIT_MODAL(state, quickEditModalOpen) {
  state.quickEditModalOpen = quickEditModalOpen;
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

/**
 * Saves the content node count to vuex state.
 * @param state - The vuex state
 * @param id - The content node id
 * @param assessment_item_count - The count of assessment items
 * @param resource_count - The count of resources
 */
export function SET_CONTENTNODES_COUNT(state, { id, assessment_item_count, resource_count }) {
  Vue.set(state.contentNodesCountMap, id, { resource_count, assessment_item_count });
}

/**
 * Removes content nodes from the contentNodesMap by parent id.
 * @param state - The vuex state
 * @param parentId - The parent content node id
 */
export function REMOVE_CONTENTNODES_BY_PARENT(state, parentId) {
  for (const key in state.contentNodesMap) {
    if (state.contentNodesMap[key].parent === parentId) {
      Vue.delete(state.contentNodesMap, key);
    }
  }
  state.contentNodesCountMap = {};
}
