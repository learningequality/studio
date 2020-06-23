export function activeDraggableHandle(state, getters, rootState, rootGetters) {
  return rootGetters['draggable/handles/activeDraggable'];
}

export function isGroupedDraggableHandle(state) {
  return function(component) {
    return state.groupedDraggableHandleIds.indexOf(component.draggableId) >= 0;
  };
}

export function isDraggingDirection(state) {
  /**
   * @param {Number} directionFlag
   * @return {Boolean}
   */
  return function(directionFlag) {
    return state.draggableDirection > 0 && state.draggableDirection & directionFlag;
  };
}
