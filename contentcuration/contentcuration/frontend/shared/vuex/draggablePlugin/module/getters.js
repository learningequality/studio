export function hoverDraggableRegionId(state, getters, rootState) {
  return rootState.draggable.regions.hoverDraggableId;
}

export function hoverDraggableCollectionId(state, getters, rootState) {
  return rootState.draggable.collections.hoverDraggableId;
}

export function hoverDraggableItemId(state, getters, rootState) {
  return rootState.draggable.items.hoverDraggableId;
}

export function activeDraggableSize(state, getters, rootState) {
  const submodule = ['items', 'collections', 'regions'].find(submodule => {
    const subState = rootState.draggable[submodule];
    if (subState) {
      const { activeDraggableId } = rootState.draggable[submodule];
      return Boolean(activeDraggableId);
    }

    return false;
  });

  return (submodule ? rootState.draggable[submodule].activeDraggableSize : 0) || 0;
}

export function isGroupedDraggableHandle(state) {
  return function({ id, universe }) {
    return (
      universe in state.groupedDraggableHandles && id in state.groupedDraggableHandles[universe]
    );
  };
}
