export function hoverDraggableRegionId(state, getters, rootState) {
  return rootState.draggable.regions.hoverDraggableId;
}

export function hoverDraggableCollectionId(state, getters, rootState) {
  return rootState.draggable.collections.hoverDraggableId;
}

export function hoverDraggableItemId(state, getters, rootState) {
  return rootState.draggable.items.hoverDraggableId;
}

export function isGroupedDraggableHandle(state) {
  return function({ id, universe }) {
    return (
      universe in state.groupedDraggableHandles && id in state.groupedDraggableHandles[universe]
    );
  };
}
