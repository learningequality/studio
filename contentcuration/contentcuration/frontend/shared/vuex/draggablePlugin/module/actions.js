import { DraggableFlags } from './constants';

export function setActiveDraggable(context, { universe }) {
  context.commit('SET_ACTIVE_DRAGGABLE_UNIVERSE', universe);
}

export function resetActiveDraggable(context) {
  context.commit('RESET_ACTIVE_DRAGGABLE_UNIVERSE');
}

export function addGroupedDraggableHandle(context, { component }) {
  if (!context.getters.isGroupedDraggableHandle(component)) {
    context.commit('ADD_GROUPED_HANDLE', component.draggableId);
  }
}

export function removeGroupedDraggableHandle(context, { component }) {
  if (context.getters.isGroupedDraggableHandle(component)) {
    context.commit('REMOVE_GROUPED_HANDLE', component.draggableId);
  }
}

export function updateDraggableDirection(context, { x, y }) {
  const { mouseX, mouseY } = context.state;
  context.commit('UPDATE_MOUSE_POSITION', { x, y });

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
