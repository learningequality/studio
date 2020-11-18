import { DraggableFlags, DraggableIdentity } from '../constants';
import * as getters from './getters';
import * as mutations from './mutations';
import * as actions from './actions';

const defaultIdentityClone = () => Object.assign({}, DraggableIdentity);

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
        // The section of the draggable that is currently hovered
        hoverDraggableSection: DraggableFlags.NONE,
        // The last section that was hovered
        lastHoverDraggableSection: DraggableFlags.NONE,
      };
    },
    getters,
    mutations,
    actions,
  };
}
