import { DraggableIdentityHelper } from '../utils';

/**
 * @return {String|null}
 */
export function activeDraggableId(state) {
  return state.activeDraggable.id;
}

/**
 * @return {String|null}
 */
export function hoverDraggableId(state) {
  return state.hoverDraggable.id;
}

export function isHoverDraggableAncestor(state, getters) {
  /**
   * @param {Object} identity
   * @return {Boolean}
   */
  return function({ id, type }) {
    return Boolean(getters.getHoverAncestor({ id, type }));
  };
}

export function getHoverAncestor(state) {
  /**
   * @param {Object} match - An object with which it will test for match with ancestor
   */
  return function(match) {
    return new DraggableIdentityHelper(state.hoverDraggable).findClosestAncestor(match);
  };
}
