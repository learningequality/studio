import { DraggableTypes } from 'shared/mixins/draggable/constants';

export function lowermostHoverDraggable(state, getters) {
  let id = null,
    type = null;

  if (getters.hoverDraggableItemId) {
    id = getters.hoverDraggableItemId;
    type = DraggableTypes.ITEM;
  } else if (getters.hoverDraggableCollectionId) {
    id = getters.hoverDraggableCollectionId;
    type = DraggableTypes.COLLECTION;
  } else if (getters.hoverDraggableRegionId) {
    id = getters.hoverDraggableRegionId;
    type = DraggableTypes.REGION;
  }

  return { id, type };
}

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
