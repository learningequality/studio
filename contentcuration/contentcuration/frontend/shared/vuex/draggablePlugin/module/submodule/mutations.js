import Vue from 'vue';
import { DraggableSectionFlags } from '../constants';

export function ADD_COMPONENT(state, component) {
  Vue.set(state.draggableComponents, component.draggableId, component);
}

export function REMOVE_COMPONENT(state, component) {
  Vue.delete(state.draggableComponents, component.draggableId);
}

export function SET_ACTIVE_DRAGGABLE(state, id) {
  state.activeDraggable = id;
}

export function RESET_ACTIVE_DRAGGABLE(state) {
  state.activeDraggable = null;
}

export function SET_HOVER_DRAGGABLE(state, id) {
  state.hoverDraggable = id;
}

export function RESET_HOVER_DRAGGABLE(state) {
  state.hoverDraggable = null;
}

export function SET_HOVER_DRAGGABLE_SECTION(state, sectionMask) {
  state.hoverDraggableSection = sectionMask;
}

export function RESET_HOVER_DRAGGABLE_SECTION(state) {
  state.hoverDraggableSection = DraggableSectionFlags.NONE;
}
