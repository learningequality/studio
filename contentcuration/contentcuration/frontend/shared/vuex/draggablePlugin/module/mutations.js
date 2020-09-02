import Vue from 'vue';
import { DraggableFlags } from './constants';

export function SET_ACTIVE_DRAGGABLE_UNIVERSE(state, id) {
  state.activeDraggableUniverse = id;
}

export function RESET_ACTIVE_DRAGGABLE_UNIVERSE(state) {
  state.activeDraggableUniverse = null;
}

export function ADD_GROUPED_HANDLE(state, payload) {
  const { id, universe } = payload;
  const universeGroup = state.groupedDraggableHandles[universe] || {};
  Vue.set(universeGroup, id, payload);
  Vue.set(state.groupedDraggableHandles, universe, universeGroup);
}

export function REMOVE_GROUPED_HANDLE(state, { id, universe }) {
  const universeGroup = state.groupedDraggableHandles[universe] || {};
  Vue.delete(universeGroup, id);
  Vue.set(state.groupedDraggableHandles, universe, universeGroup);
}

export function UPDATE_MOUSE_POSITION(state, { x, y }) {
  state.mouseX = x;
  state.mouseY = y;
}

export function UPDATE_DRAGGABLE_DIRECTION(state, dirFlag) {
  state.draggableDirection = dirFlag;
}

export function RESET_DRAGGABLE_DIRECTION(state) {
  state.draggableDirection = DraggableFlags.NONE;
}
