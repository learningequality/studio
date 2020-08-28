export function activeDraggableHandle(state, getters, rootState, rootGetters) {
  return rootGetters['draggable/handles/activeDraggable'];
}

export function isGroupedDraggableHandle(state) {
  return function(component) {
    return state.groupedDraggableHandleIds.indexOf(component.draggableId) >= 0;
  };
}
