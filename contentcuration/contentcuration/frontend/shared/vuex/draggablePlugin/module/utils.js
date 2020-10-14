import { DraggableFlags } from './constants';
import { DraggableTypes } from 'shared/mixins/draggable/constants';

/**
 * Helper with getters to grab different draggable ancestor types based
 * on an identity object, which contains ID's and ancestor data
 */
export class DraggableIdentityHelper {
  constructor(identity) {
    this._identity = identity;
  }

  findAncestor(id, type) {
    return this._identity.ancestors.find(a => a.id === id && a.type === type);
  }

  get region() {
    return this._identity.regionId
      ? this.findAncestor(this._identity.regionId, DraggableTypes.REGION)
      : null;
  }

  get collection() {
    return this._identity.collectionId
      ? this.findAncestor(this._identity.collectionId, DraggableTypes.COLLECTION)
      : null;
  }

  get item() {
    return this._identity.itemId
      ? this.findAncestor(this._identity.itemId, DraggableTypes.ITEM)
      : null;
  }
}

/**
 * Helper that turns a draggable flags bitmask into an object with each
 * booleans for each direction
 *
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
    any: mask > 0,
  };
}
