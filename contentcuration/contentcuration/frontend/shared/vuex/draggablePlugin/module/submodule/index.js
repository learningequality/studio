import { DraggableFlags, DraggableIdentityDefaults } from '../constants';
import * as getters from './getters';
import * as mutations from './mutations';
import * as actions from './actions';

const defaultIdentityClone = () => Object.assign({}, DraggableIdentityDefaults);

export default function draggableSubmodule(draggableType) {
  return {
    namespaced: true,
    state() {
      return {
        draggableType,
        activeDraggable: defaultIdentityClone(),
        activeDraggableSize: null,
        hoverDraggable: defaultIdentityClone(),
        lastHoverDraggable: defaultIdentityClone(),
        hoverDraggableSection: DraggableFlags.NONE,
        lastHoverDraggableSection: DraggableFlags.NONE,
      };
    },
    getters,
    mutations,
    actions,
  };
}
