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
