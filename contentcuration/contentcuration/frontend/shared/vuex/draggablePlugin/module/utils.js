import { DraggableFlags } from './constants';

/**
 * @param {Number} mask
 * @returns {{top: bool, left: bool, bottom: bool, up: bool, right: bool, down: bool}}
 */
export function bitMaskToObject(mask) {
  return {
    top: Boolean(mask & DraggableFlags.TOP),
    up: Boolean(mask & DraggableFlags.UP),
    bottom: Boolean(mask & DraggableFlags.BOTTOM),
    down: Boolean(mask & DraggableFlags.DOWN),
    left: Boolean(mask & DraggableFlags.LEFT),
    right: Boolean(mask & DraggableFlags.RIGHT),
  };
}
