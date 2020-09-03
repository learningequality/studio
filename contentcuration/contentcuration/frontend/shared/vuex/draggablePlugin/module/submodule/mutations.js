import { DraggableFlags } from '../constants';

export function SET_ACTIVE_DRAGGABLE(state, id) {
  state.activeDraggableId = id;
}

export function RESET_ACTIVE_DRAGGABLE(state) {
  state.activeDraggableId = null;
}

export function SET_ACTIVE_DRAGGABLE_SIZE(state, size) {
  state.activeDraggableSize = size;
}

export function SET_HOVER_DRAGGABLE(state, id) {
  state.hoverDraggableId = id;
}

export function RESET_HOVER_DRAGGABLE(state) {
  state.hoverDraggableId = null;
}

export function SET_LAST_HOVER_DRAGGABLE(state, id) {
  state.lastHoverDraggableId = id;
}

export function RESET_LAST_HOVER_DRAGGABLE(state) {
  state.lastHoverDraggableId = null;
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

export function SET_TARGET_DRAGGABLE_SECTION(state, sectionMask) {
  state.targetDraggableSection = sectionMask;
}

export function RESET_TARGET_DRAGGABLE_SECTION(state) {
  state.targetDraggableSection = DraggableFlags.NONE;
}
