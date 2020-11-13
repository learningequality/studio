import { DraggableFlags } from 'shared/vuex/draggablePlugin/module/constants';
import { bitMaskToObject } from 'shared/vuex/draggablePlugin/module/utils';
import { DragEffect } from 'shared/mixins/draggable/constants';

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

export function updateHoverDraggable(context, { id, minX, maxX, minY, maxY, dragEffect = null }) {
  if (id !== context.getters.hoverDraggableId) {
    return;
  }

  let { clientX, clientY } = context.rootState.draggable;
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

  // If drop effect is sort, then the targeting logic is useful for determine intended
  // location, eg before or after, which can depend on mouse momentum
  if (dragEffect === DragEffect.SORT) {
    return context.dispatch('updateHoverDraggableTarget');
  }
}

/**
 * Determines the section of which we should register potential placement of
 * the current draggable items.
 */
export function updateHoverDraggableTarget(context) {
  let section = DraggableFlags.NONE;
  const { lastHoverDraggableId, hoverDraggableSection, lastHoverDraggableSection } = context.state;
  const { draggableDirection } = context.rootState.draggable;

  // If no section is being hovered over, so no target section should be displayed
  if (hoverDraggableSection === DraggableFlags.NONE) {
    context.commit('SET_HOVER_DRAGGABLE_TARGET', section);
    return;
  }

  // Get all booleans for hover section and direction flags
  const hoverSection = bitMaskToObject(hoverDraggableSection);
  const direction = bitMaskToObject(draggableDirection);

  // When the user has dragged from outside of the universe, or is dragging from the area of the
  // item that has just started dragging.
  if (!lastHoverDraggableId) {
    // If it's an entrance, we want to target the same section that the user
    // has entered through dragging
    section ^= hoverSection.top ? DraggableFlags.TOP : DraggableFlags.BOTTOM;
    section ^= hoverSection.left ? DraggableFlags.LEFT : DraggableFlags.RIGHT;
  } else {
    // We'll use the last hover section to determine if the user has changed directions
    // within a dropzone and therefore to retarget appropriately when they cross the
    // boundary of a section
    const lastHoverSection = bitMaskToObject(lastHoverDraggableSection);

    if (lastHoverSection.bottom || (!lastHoverSection.any && hoverSection.bottom && direction.up)) {
      section ^= DraggableFlags.TOP;
    } else if (
      lastHoverSection.top ||
      (!lastHoverSection.any && hoverSection.top && direction.down)
    ) {
      section ^= DraggableFlags.BOTTOM;
    }

    if (lastHoverSection.right || (hoverSection.right && direction.left)) {
      section ^= DraggableFlags.LEFT;
    } else if (lastHoverSection.left || (hoverSection.left && direction.right)) {
      section ^= DraggableFlags.RIGHT;
    }
  }

  context.commit('SET_HOVER_DRAGGABLE_TARGET', section);
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
