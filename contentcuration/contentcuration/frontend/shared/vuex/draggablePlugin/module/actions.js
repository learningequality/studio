import { bindEventHandling } from './utils';
import { DraggableDirectionFlags } from 'shared/vuex/draggablePlugin/module/constants';

export function setActiveDraggable(context, { component }) {
  context.commit('SET_ACTIVE_DRAGGABLE_UNIVERSE', component.draggableUniverse);
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

export function addSiblingEventHandling(context, { component }) {
  // When the component we're adding isn't the active component being dragged, hook into the
  // active component to cascade events
  const active = context.getters.activeHandle;
  const removeListeners = bindEventHandling([], active, component);

  active.$once('dragReset', removeListeners);
  active.$once('dragdrop', removeListeners);
  component.$once('dragReset', removeListeners);
}

export function updateDraggableDirection(context, { x, y, lastX, lastY }) {
  const xDiff = x - lastX;
  const yDiff = y - lastY;
  let dir = DraggableDirectionFlags.NONE;

  if (xDiff > 0) {
    dir ^= DraggableDirectionFlags.RIGHT;
  } else if (xDiff < 0) {
    dir ^= DraggableDirectionFlags.LEFT;
  }

  if (yDiff > 0) {
    dir ^= DraggableDirectionFlags.DOWN;
  } else if (yDiff < 0) {
    dir ^= DraggableDirectionFlags.UP;
  }

  // If direction would be none, just ignore it. When dragging stops, it should
  // be reset anyway
  if (dir > DraggableDirectionFlags.NONE) {
    context.commit('UPDATE_DRAGGABLE_DIRECTION', dir);
  }
}
