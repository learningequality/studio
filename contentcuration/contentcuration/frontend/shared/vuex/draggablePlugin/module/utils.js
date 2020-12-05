import isMatch from 'lodash/isMatch';
import { DraggableFlags } from './constants';
import { DraggableTypes } from 'shared/mixins/draggable/constants';

/**
 * Helper with getters to grab different draggable ancestor types based
 * on an identity object, which contains ID's and ancestor data
 */
export class DraggableIdentityHelper {
  /**
   * @param {DraggableIdentity|Object} identity
   */
  constructor(identity) {
    this._identity = identity;
    this.ancestorsOrdered = (identity.ancestors || []).slice().reverse();
  }

  get id() {
    return this._identity.id;
  }

  get type() {
    return this._identity.type;
  }

  get universe() {
    return this._identity.universe;
  }

  get ancestors() {
    return this._identity.ancestors;
  }

  get metadata() {
    return this._identity.metadata;
  }

  get key() {
    const { universe, type, id } = this._identity;
    return `${universe}/${type}/${id}`;
  }

  get region() {
    return this.findClosestAncestor({ type: DraggableTypes.REGION });
  }

  get collection() {
    return this.findClosestAncestor({ type: DraggableTypes.COLLECTION });
  }

  get item() {
    return this.findClosestAncestor({ type: DraggableTypes.ITEM });
  }

  /**
   * Whether this identity matches the one passed in
   *
   * @param {String} id
   * @param {String} type
   * @param {String} universe
   * @return {Boolean}
   */
  is({ id, type, universe }) {
    return isMatch(this._identity, { id, type, universe });
  }

  /**
   * Finds the closest ancestor that matches the `matcher` obj passed in
   *
   * @param {Object} matcher
   * @return {DraggableIdentity|null}
   */
  findClosestAncestor(matcher) {
    const { id, type } = this._identity;
    return this.ancestorsOrdered.find(a => isMatch(a, matcher) && !isMatch(a, { id, type }));
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
