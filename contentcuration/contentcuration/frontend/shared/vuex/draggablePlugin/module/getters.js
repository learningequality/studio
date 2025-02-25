import isString from 'lodash/isString';
import { DraggableSearchOrder, DraggableTypes } from 'shared/mixins/draggable/constants';
import { DraggableIdentityHelper } from 'shared/vuex/draggablePlugin/module/utils';

export function deepestHoverDraggable(state, getters, rootState) {
  return DraggableSearchOrder.map(type => {
    const sub = rootState.draggable[`${type}s`];
    return sub ? sub.hoverDraggable : null;
  }).find(identity => identity && identity.id);
}

export function deepestActiveDraggable(state, getters, rootState) {
  return DraggableSearchOrder.map(type => {
    const sub = rootState.draggable[`${type}s`];
    return sub ? sub.activeDraggable : null;
  }).find(identity => identity && identity.id);
}

export function isHoverDraggableAncestor(state, getters, rootState, rootGetters) {
  /**
   * @param {Object} identity
   * @return {Boolean}
   */
  return function (identity) {
    const { type } = getters.deepestHoverDraggable || {};
    return type ? rootGetters[`draggable/${type}s/isHoverDraggableAncestor`](identity) : false;
  };
}

export function activeDraggableRegionId(state, getters, rootState, rootGetters) {
  return rootGetters['draggable/regions/activeDraggableId'];
}

export function activeDraggableCollectionId(state, getters, rootState, rootGetters) {
  return rootGetters['draggable/collections/activeDraggableId'];
}

export function activeDraggableItemId(state, getters, rootState, rootGetters) {
  return rootGetters['draggable/items/activeDraggableId'];
}

export function hoverDraggableRegionId(state, getters, rootState, rootGetters) {
  return rootGetters['draggable/regions/hoverDraggableId'];
}

export function hoverDraggableCollectionId(state, getters, rootState, rootGetters) {
  return rootGetters['draggable/collections/hoverDraggableId'];
}

export function hoverDraggableItemId(state, getters, rootState, rootGetters) {
  return rootGetters['draggable/items/hoverDraggableId'];
}

export function activeDraggableSize(state, getters, rootState) {
  const { type } = getters.deepestActiveDraggable || {};
  return (type ? rootState.draggable[`${type}s`].activeDraggableSize : 0) || 0;
}

export function isGroupedDraggableHandle(state) {
  return function (identity) {
    if (identity.type === DraggableTypes.HANDLE) {
      const { key } = new DraggableIdentityHelper(identity);
      return key in state.groupedDraggableHandles;
    }

    return false;
  };
}

export function getDraggableDropData(state) {
  /**
   * @param {DraggableIdentity} identity
   * @return {{
   *  sources: DraggableIdentity[],
   *  identity: DraggableIdentity,
   *  section: Number,
   *  relative: Number,
   *  target: {
   *    identity: DraggableIdentity,
   *    section: Number,
   *    relative: Number
   *  }}|undefined}
   */
  return function (identity) {
    // Ancestors will map to the string of the actual data, instead of duplicating,
    // as prepared in code below
    const destination = new DraggableIdentityHelper(identity);
    const key = isString(state.draggableContainerDrops[destination.key])
      ? state.draggableContainerDrops[destination.key]
      : destination.key;
    return state.draggableContainerDrops[key];
  };
}
