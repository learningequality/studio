import { DraggableTypes } from 'shared/mixins/draggable/constants';

const DRAGGABLE_SEARCH = [DraggableTypes.ITEM, DraggableTypes.COLLECTION, DraggableTypes.REGION];

function submoduleStateType(rootState, name) {
  return DRAGGABLE_SEARCH.find(type => Boolean(rootState.draggable[`${type}s`][`${name}`]));
}

function submoduleGetterType(rootGetters, name) {
  return DRAGGABLE_SEARCH.find(type => Boolean(rootGetters[`draggable/${type}s/${name}`]));
}

export function lowermostHoverDraggable(state, getters, rootState, rootGetters) {
  const type = submoduleGetterType(rootGetters, 'hoverDraggableId');
  const id = type ? rootGetters[`draggable/${type}s/hoverDraggableId`] : null;
  return { id, type };
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

export function activeDraggableSize(state, getters, rootState, rootGetters) {
  const type = submoduleGetterType(rootGetters, 'activeDraggableId');
  return (type ? rootState.draggable[`${type}s`].activeDraggableSize : 0) || 0;
}

export function isGroupedDraggableHandle(state) {
  return function({ id, universe }) {
    return (
      universe in state.groupedDraggableHandles && id in state.groupedDraggableHandles[universe]
    );
  };
}

export function getDraggableDropData(state, getters, rootState, rootGetters) {
  return function(includeGrouped = false) {
    const sourceType = submoduleStateType(rootState, 'activeDraggable');
    const { type: targetType } = getters.lowermostHoverDraggable;

    if (!sourceType || !targetType) {
      return null;
    }

    const sourceItem = rootState.draggable[`${sourceType}s`].activeDraggable;
    const sources = [sourceItem];

    if (includeGrouped) {
      // TODO
    }

    const targetState = rootState.draggable[`${targetType}s`];

    return {
      sources,
      target: targetState.hoverDraggable,
      section: targetState.hoverDraggableSection,
      relative: rootGetters[`draggable/${targetType}s/draggingTargetSection`],
    };
  };
}
