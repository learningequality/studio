import { DraggableFlags } from '../constants';

export function SET_ACTIVE_DRAGGABLE(state, identity) {
  state.activeDraggable = identity;
}

export function RESET_ACTIVE_DRAGGABLE(state) {
  state.activeDraggable = null;
}

export function SET_ACTIVE_DRAGGABLE_SIZE(state, size) {
  state.activeDraggableSize = size;
}

export function SET_HOVER_DRAGGABLE(state, identity) {
  state.hoverDraggable = identity;
}

export function RESET_HOVER_DRAGGABLE(state) {
  state.hoverDraggable = null;
}

export function SET_LAST_HOVER_DRAGGABLE(state, identity) {
  state.lastHoverDraggable = identity;
}

export function RESET_LAST_HOVER_DRAGGABLE(state) {
  state.lastHoverDraggable = null;
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
