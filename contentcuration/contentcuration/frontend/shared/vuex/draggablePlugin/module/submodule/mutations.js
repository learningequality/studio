import { set } from 'vue';
import { DraggableFlags, DraggableIdentity } from '../constants';

/**
 * @param {Vuex.State} state
 * @param {String} name
 * @param {Object|null} [obj]
 */
function setIdentity(state, name, obj = null) {
  if (!obj) {
    obj = DraggableIdentity;
  }

  Object.keys(obj).forEach(key => {
    set(state[name], key, obj[key]);
  });
}

export function SET_ACTIVE_DRAGGABLE(state, identity) {
  setIdentity(state, 'activeDraggable', identity);
}

export function RESET_ACTIVE_DRAGGABLE(state) {
  setIdentity(state, 'activeDraggable');
}

export function SET_ACTIVE_DRAGGABLE_SIZE(state, size) {
  state.activeDraggableSize = size;
}

export function SET_HOVER_DRAGGABLE(state, identity) {
  setIdentity(state, 'hoverDraggable', identity);
}

export function RESET_HOVER_DRAGGABLE(state) {
  setIdentity(state, 'hoverDraggable');
}

export function SET_LAST_HOVER_DRAGGABLE(state, identity) {
  setIdentity(state, 'lastHoverDraggable', identity);
}

export function RESET_LAST_HOVER_DRAGGABLE(state) {
  setIdentity(state, 'lastHoverDraggable');
}

export function SET_HOVER_DRAGGABLE_SECTION(state, sectionMask) {
  state.hoverDraggableSection = sectionMask;
}

export function SET_LAST_HOVER_DRAGGABLE_SECTION(state, sectionMask) {
  state.lastHoverDraggableSection = sectionMask;
}

export function RESET_HOVER_DRAGGABLE_SECTION(state) {
  state.hoverDraggableSection = DraggableFlags.NONE;
}

export function RESET_LAST_HOVER_DRAGGABLE_SECTION(state) {
  state.lastHoverDraggableSection = DraggableFlags.NONE;
}

export function SET_HOVER_DRAGGABLE_TARGET(state, sectionMask) {
  state.hoverDraggableTarget = sectionMask;
}

export function RESET_HOVER_DRAGGABLE_TARGET(state) {
  state.hoverDraggableTarget = DraggableFlags.NONE;
}
