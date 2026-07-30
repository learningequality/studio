/**
 * Math utilities for the QTI editor.
 */

/**
 * Matches valid numeric answer values: integers, decimals, and scientific notation.
 */
export const floatOrIntRegex = /^(?=.)([+-]?([0-9e]*)(\.([0-9e]+))?)$/;
