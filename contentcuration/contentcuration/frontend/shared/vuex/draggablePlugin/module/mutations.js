import { DraggableDirectionFlags } from './constants';

export function SET_ACTIVE_DRAGGABLE_UNIVERSE(state, id) {
  state.activeDraggableUniverse = id;
}

export function RESET_ACTIVE_DRAGGABLE_UNIVERSE(state) {
  state.activeDraggableUniverse = null;
}

export function ADD_GROUPED_HANDLE(state, id) {
  state.groupedDraggableHandleIds.push(id);
}

export function REMOVE_GROUPED_HANDLE(state, id) {
  state.groupedDraggableHandleIds.splice(state.groupedHandleIds.indexOf(id), 1);
}

export function UPDATE_DRAGGABLE_DIRECTION(state, dirFlag) {
  state.draggableDirection = dirFlag;
}

export function RESET_DRAGGABLE_DIRECTION(state) {
  state.draggableDirection = DraggableDirectionFlags.NONE;
}
