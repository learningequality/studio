import { DraggableFlags } from './constants';

export function setActiveDraggable(context, { universe, regionId, collectionId, itemId }) {
  context.commit('SET_ACTIVE_DRAGGABLE_UNIVERSE', universe);
  const opts = { root: true };

  // This gets triggered when picking up a handle, so we'll trigger activation
  // of the ancestor draggable elements
  if (regionId) {
    context.dispatch('draggable/regions/setActiveDraggable', { id: regionId }, opts);
  }
  if (collectionId) {
    context.dispatch('draggable/collections/setActiveDraggable', { id: collectionId }, opts);
  }
  if (itemId) {
    context.dispatch('draggable/items/setActiveDraggable', { id: itemId }, opts);
  }
}

export function resetActiveDraggable(context) {
  context.commit('RESET_ACTIVE_DRAGGABLE_UNIVERSE');

  const opts = { root: true };
  context.dispatch('draggable/regions/resetActiveDraggable', {}, opts);
  context.dispatch('draggable/collections/resetActiveDraggable', {}, opts);
  context.dispatch('draggable/items/resetActiveDraggable', {}, opts);
}

/**
 * @param context
 * @param {{id, regionId, collectionId, itemId}} payload
 */
export function addGroupedDraggableHandle(context, payload) {
  const { id, universe } = payload;
  if (!context.getters.isGroupedDraggableHandle({ id, universe })) {
    context.commit('ADD_GROUPED_HANDLE', payload);
  }
}

/**
 * @param context
 * @param {{id, regionId, collectionId, itemId}} payload
 */
export function removeGroupedDraggableHandle(context, payload) {
  const { id, universe } = payload;
  if (context.getters.isGroupedDraggableHandle({ id, universe })) {
    context.commit('REMOVE_GROUPED_HANDLE', payload);
  }
}

/**
 * Determines the direction of mouse motion, which should only change when
 * the user actually changes mouse direction
 */
export function updateDraggableDirection(context, { x, y }) {
  const { mouseX, mouseY } = context.state;

  if (mouseX !== x || mouseY !== y) {
    context.commit('UPDATE_MOUSE_POSITION', { x, y });
  }

  if (mouseX === null || mouseY === null) {
    return;
  }

  const xDiff = x - mouseX;
  const yDiff = y - mouseY;
  let dir = context.state.draggableDirection;

  if (xDiff > 0) {
    dir |= DraggableFlags.RIGHT;
    dir ^= dir & DraggableFlags.LEFT;
  } else if (xDiff < 0) {
    dir |= DraggableFlags.LEFT;
    dir ^= dir & DraggableFlags.RIGHT;
  }

  if (yDiff > 0) {
    dir |= DraggableFlags.DOWN;
    dir ^= dir & DraggableFlags.UP;
  } else if (yDiff < 0) {
    dir |= DraggableFlags.UP;
    dir ^= dir & DraggableFlags.DOWN;
  }

  // If direction would be none, just ignore it. When dragging stops, it should
  // be reset anyway
  if (dir > DraggableFlags.NONE) {
    context.commit('UPDATE_DRAGGABLE_DIRECTION', dir);
  }
}

export function resetDraggableDirection(context) {
  context.commit('RESET_DRAGGABLE_DIRECTION');
  context.commit('UPDATE_MOUSE_POSITION', { x: null, y: null });
}
