import Vue from 'vue';
import { DraggableSectionFlags } from '../constants';

export function ADD_COMPONENT(state, component) {
  Vue.set(state.draggableComponents, component.draggableId, component);
}

export function REMOVE_COMPONENT(state, component) {
  Vue.delete(state.draggableComponents, component.draggableId);
}

export function SET_ACTIVE_DRAGGABLE(state, id) {
  state.activeDraggableId = id;
}

export function RESET_ACTIVE_DRAGGABLE(state) {
  state.activeDraggableId = null;
}

export function SET_HOVER_DRAGGABLE(state, id) {
  state.hoverDraggableId = id;
}

export function SET_LAST_HOVER_DRAGGABLE(state, id) {
  state.hoverDraggableId = id;
}

export function RESET_HOVER_DRAGGABLE(state) {
  state.hoverDraggableId = null;
}

export function RESET_LAST_HOVER_DRAGGABLE(state) {
  state.hoverDraggableId = null;
}

export function SET_HOVER_DRAGGABLE_SECTION(state, sectionMask) {
  state.hoverDraggableSection = sectionMask;
}

export function SET_LAST_HOVER_DRAGGABLE_SECTION(state, sectionMask) {
  state.lastHoverDraggableSection = sectionMask;
}

export function RESET_HOVER_DRAGGABLE_SECTION(state) {
  state.hoverDraggableSection = DraggableSectionFlags.NONE;
}

export function RESET_LAST_HOVER_DRAGGABLE_SECTION(state) {
  state.lastHoverDraggableSection = DraggableSectionFlags.NONE;
}
