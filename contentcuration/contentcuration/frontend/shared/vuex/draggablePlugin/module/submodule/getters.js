import { DraggableFlags } from '../constants';
import { bitMaskToObject } from '../utils';

export function isInActiveDraggableUniverse(state, getters, rootState) {
  /**
   * @param {string} id
   * @return {Boolean}
   */
  return function(universe) {
    return universe === rootState.draggable.activeDraggableUniverse;
  };
}

export function isDraggableEntrance(state) {
  return !state.lastHoverDraggableId || state.lastHoverDraggableId === state.activeDraggableId;
}

export function draggingTargetSection(state, getters, rootState) {
  let section = DraggableFlags.NONE;
  const { hoverDraggableSection, lastHoverDraggableSection } = state;
  const { draggableDirection } = rootState.draggable;

  if (hoverDraggableSection === DraggableFlags.NONE) {
    return section;
  }

  const hoverSection = bitMaskToObject(hoverDraggableSection);
  const direction = bitMaskToObject(draggableDirection);
  const { isDraggableEntrance } = getters;

  if (isDraggableEntrance) {
    section ^= hoverSection.top ? DraggableFlags.TOP : DraggableFlags.BOTTOM;
    section ^= hoverSection.left ? DraggableFlags.LEFT : DraggableFlags.RIGHT;
  } else {
    const lastHoverSection = bitMaskToObject(lastHoverDraggableSection);

    if (lastHoverSection.bottom || (hoverSection.bottom && direction.up)) {
      section ^= DraggableFlags.TOP;
    } else if (lastHoverSection.top || (hoverSection.top && direction.down)) {
      section ^= DraggableFlags.BOTTOM;
    }

    if (lastHoverSection.right || (hoverSection.right && direction.left)) {
      section ^= DraggableFlags.LEFT;
    } else if (lastHoverSection.left || (hoverSection.left && direction.right)) {
      section ^= DraggableFlags.RIGHT;
    }
  }

  return section;
}
