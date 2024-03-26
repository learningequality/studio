import { DraggableFlags } from 'shared/vuex/draggablePlugin/module/constants';

export function setActiveDraggable(context, identity) {
  context.commit('SET_ACTIVE_DRAGGABLE', identity);
}

export function resetActiveDraggable(context) {
  context.commit('RESET_ACTIVE_DRAGGABLE');
}

export function setActiveDraggableSize(context, { size }) {
  context.commit('SET_ACTIVE_DRAGGABLE_SIZE', size);
}

export function setHoverDraggable(context, identity) {
  // Make sure we've not trying set the same draggable, or the active draggable as the
  // hover draggable
  const { id, universe } = identity;
  const { activeDraggableUniverse } = context.rootState.draggable;

  if (
    context.getters.hoverDraggableId !== id &&
    context.getters.activeDraggableId !== id &&
    universe === activeDraggableUniverse &&
    !context.getters.isHoverDraggableAncestor(identity)
  ) {
    context.commit('SET_LAST_HOVER_DRAGGABLE', context.state.hoverDraggable);
    context.commit('SET_HOVER_DRAGGABLE', identity);
  }
}

export function updateHoverDraggable(context, { id, minX, maxX, minY, maxY }) {
  if (id !== context.getters.hoverDraggableId) {
    return;
  }

  const { clientX, clientY } = context.rootState.draggable;
  let section = DraggableFlags.NONE;

  // Determine the quadrant of the element's bounds that the user is dragging over
  if (clientX >= minX && clientX <= maxX && clientY >= minY && clientY <= maxY) {
    const horizontalMidpoint = (maxX - minX) / 2 + minX;
    const verticalMidpoint = (maxY - minY) / 2 + minY;

    section ^= clientX <= horizontalMidpoint ? DraggableFlags.LEFT : DraggableFlags.RIGHT;

    section ^= clientY <= verticalMidpoint ? DraggableFlags.TOP : DraggableFlags.BOTTOM;
  }

  if (section > DraggableFlags.NONE) {
    // If the ID of the draggable isn't the current one, then we'll set it since we rely on
    // the dragging over for the entry "event" of dragging over a dropzone
    if (section !== context.state.hoverDraggableSection) {
      context.commit('SET_LAST_HOVER_DRAGGABLE_SECTION', context.state.hoverDraggableSection);
    }

    context.commit('SET_HOVER_DRAGGABLE_SECTION', section);
  }
}

export function resetHoverDraggable(context, { id = null }) {
  // When we have an origin, and it's a different draggable than the currently hovered one
  // we'll just skip and assume an "enter" fired before we reached this via a "leave" event
  if (id && id !== context.getters.hoverDraggableId) {
    return;
  }

  context.commit('RESET_HOVER_DRAGGABLE_SECTION');
  context.commit('RESET_LAST_HOVER_DRAGGABLE_SECTION');
  context.commit('RESET_HOVER_DRAGGABLE');
  context.commit('RESET_LAST_HOVER_DRAGGABLE');
  context.commit('RESET_HOVER_DRAGGABLE_TARGET');
}
