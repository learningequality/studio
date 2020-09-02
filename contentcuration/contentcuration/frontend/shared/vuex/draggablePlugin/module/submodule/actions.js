import { DraggableFlags } from 'shared/vuex/draggablePlugin/module/constants';
import { animationThrottle } from 'shared/utils';

export function setActiveDraggable(context, { id }) {
  context.commit('SET_ACTIVE_DRAGGABLE', id);
}

export function resetActiveDraggable(context) {
  context.commit('RESET_ACTIVE_DRAGGABLE');
}

export function setHoverDraggable(context, { id, universe }) {
  // Make sure we've not trying set the same draggable, or the active draggable as the
  // hover draggable
  if (
    context.state.hoverDraggableId !== id &&
    context.state.activeDraggableId !== id &&
    context.getters.isInActiveDraggableUniverse(universe)
  ) {
    context.commit('SET_LAST_HOVER_DRAGGABLE', context.state.hoverDraggableId);
    context.commit('SET_HOVER_DRAGGABLE', id);
  }
}

/**
 * Wrap this action in an animation throttle so draggable elements of this type should
 * update in the same animation frame
 */
export const updateHoverDraggable = animationThrottle(function(
  context,
  { id, universe, clientX, clientY, minX, maxX, minY, maxY }
) {
  // If it's not in the same universe, we should ignore the hovering
  const inUniverse = context.getters.isInActiveDraggableUniverse(universe);

  if (inUniverse) {
    let section = 0;

    // Determine the quadrant of the element's bounds that the user is dragging over
    if (clientX >= minX && clientX <= maxX && clientY >= minY && clientY <= maxY) {
      const horizontalMidpoint = (maxX - minX) / 2 + minX;
      const verticalMidpoint = (maxY - minY) / 2 + minY;

      section ^= clientX <= horizontalMidpoint ? DraggableFlags.LEFT : DraggableFlags.RIGHT;

      section ^= clientY <= verticalMidpoint ? DraggableFlags.TOP : DraggableFlags.BOTTOM;
    }

    // If the ID of the draggable isn't the current one, then we'll set it since we rely on
    // the dragging over for the entry "event" of dragging over a dropzone
    if (context.state.hoverDraggableId !== id) {
      context.commit('SET_LAST_HOVER_DRAGGABLE', context.state.hoverDraggableId);
      context.commit('SET_HOVER_DRAGGABLE', id);
      context.commit('RESET_LAST_HOVER_DRAGGABLE_SECTION');
    } else if (section !== context.state.hoverDraggableSection) {
      context.commit('SET_LAST_HOVER_DRAGGABLE_SECTION', context.state.hoverDraggableSection);
    }

    context.commit('SET_HOVER_DRAGGABLE_SECTION', section);
  } else {
    context.dispatch('resetHoverDraggable', { id });
  }
});

export function resetHoverDraggable(context, { id = null }) {
  // When we have an origin, and it's a different draggable than the currently hovered one
  // we'll just skip and assume an "enter" fired before we reached this via a "leave" event
  if (id && id !== context.state.hoverDraggableId) {
    return;
  }

  context.commit('RESET_HOVER_DRAGGABLE_SECTION');
  context.commit('RESET_LAST_HOVER_DRAGGABLE_SECTION');
  context.commit('RESET_HOVER_DRAGGABLE');
  context.commit('RESET_LAST_HOVER_DRAGGABLE');
}
