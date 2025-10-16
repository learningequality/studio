/**
 * Utility functions to detect browser and device capabilities.
 * Currently studio isn't fully buit for touch devices,
 * this file should be used for future-proofing
 */

// Check for presence of the touch event in DOM or multi-touch capabilities
export const isTouchDevice =
  'ontouchstart' in window ||
  window.navigator?.maxTouchPoints > 0 ||
  window.navigator?.msMaxTouchPoints > 0;
