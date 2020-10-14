import { DraggableFlags } from '../constants';
import * as getters from './getters';
import * as mutations from './mutations';
import * as actions from './actions';

export default function draggableSubmodule(draggableType) {
  return {
    namespaced: true,
    state() {
      return {
        draggableType,
        activeDraggable: null,
        activeDraggableSize: null,
        hoverDraggable: null,
        lastHoverDraggable: null,
        hoverDraggableSection: DraggableFlags.NONE,
        lastHoverDraggableSection: DraggableFlags.NONE,
      };
    },
    getters,
    mutations,
    actions,
  };
}
