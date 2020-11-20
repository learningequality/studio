/**
 * Flags for representing motion or physical position of an area
 *
 * They can be combined, such that `m = TOP | LEFT` would represent a top-left area,
 * and can be tested for each by `m & LEFT` for left side, and `m & TOP` for top side.
 *
 * The same works for direction
 */
export const DraggableFlags = {
  NONE: 0,
  UP: 1,
  TOP: 1,
  DOWN: 2,
  BOTTOM: 2,
  LEFT: 4,
  RIGHT: 8,
};

/**
 * Structure and defaults for draggable identity
 * @interface
 */
export const DraggableIdentity = {
  /**
   * @var {String|null}
   */
  id: null,
  /**
   * @var {String|null}
   */
  type: null,
  /**
   * @var {String|null}
   */
  universe: null,
  /**
   * @var {DraggableIdentity[]|null}
   */
  ancestors: null,
  /**
   * @var {mixed|null}
   */
  metadata: null,
};

/**
 * @type {number} milliseconds
 */
export const MinimumDragTime = 100;
