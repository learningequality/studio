export function getDraggableComponent(state) {
  /**
   * @param {string} id
   * @return {VueComponent}
   */
  return function(id) {
    return id && id in state.draggableComponents ? state.draggableComponents[id] : null;
  };
}

export function activeDraggable(state, getters) {
  return state.activeDraggableId ? getters.getDraggableComponent(state.activeDraggableId) : null;
}

export function hoverDraggable(state, getters) {
  return state.hoverDraggableId ? getters.getDraggableComponent(state.hoverDraggableId) : null;
}

export function isHoverDraggable(state) {
  /**
   * @param {string} id
   * @return {Boolean}
   */
  return function(id) {
    return state.hoverDraggableId === id;
  };
}

export function isDraggingOverSection(state) {
  /**
   * @param {Number} sectionFlag
   * @param {string} [id]
   * @return {Boolean}
   */
  return function(sectionFlag, id = null) {
    if (id !== null && id !== state.hoverDraggableId) {
      return false;
    }

    return state.hoverDraggableSection > 0 && state.hoverDraggableSection & sectionFlag;
  };
}

export function isInActiveDraggableUniverse(state, getters, rootState) {
  /**
   * @param {string} id
   * @return {Boolean}
   */
  return function(id) {
    const component = getters.getDraggableComponent(id);
    const activeUniverse = rootState.draggable.activeDraggableUniverse;

    return component && component.draggableUniverse === activeUniverse;
  };
}
