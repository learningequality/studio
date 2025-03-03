import Vue, { set } from 'vue';
import { DraggableFlags } from './constants';
import { DraggableIdentityHelper } from 'shared/vuex/draggablePlugin/module/utils';

export function SET_DRAG_START_TIME(state, time) {
  state.dragStartTime = time;
}

export function RESET_DRAG_START_TIME(state) {
  state.dragStartTime = null;
}

export function SET_ACTIVE_DRAGGABLE_UNIVERSE(state, universe) {
  state.activeDraggableUniverse = universe;
}

export function RESET_ACTIVE_DRAGGABLE_UNIVERSE(state) {
  state.activeDraggableUniverse = null;
}

export function ADD_GROUPED_HANDLE(state, identity) {
  const { key } = new DraggableIdentityHelper(identity);
  set(state.groupedDraggableHandles, key, identity);
}

export function REMOVE_GROUPED_HANDLE(state, identity) {
  const { key } = new DraggableIdentityHelper(identity);
  Vue.delete(state.groupedDraggableHandles, key);
}

export function UPDATE_MOUSE_POSITION(state, { x, y }) {
  state.clientX = x;
  state.clientY = y;
}

export function UPDATE_DRAGGABLE_DIRECTION(state, dirFlag) {
  state.draggableDirection = dirFlag;
}

export function RESET_DRAGGABLE_DIRECTION(state) {
  state.draggableDirection = DraggableFlags.NONE;
}

export function ADD_DRAGGABLE_CONTAINER_DROPS(state, data) {
  for (const key in data) {
    set(state.draggableContainerDrops, key, data[key]);
  }
}

export function REMOVE_DRAGGABLE_CONTAINER_DROPS(state, keys) {
  for (const key of keys) {
    Vue.delete(state.draggableContainerDrops, key);
  }
}
