/**
 * Math utilities for the QTI editor.
 */

// xsd:double lexical space without INF and NaN.
const xsdDoubleRegex = /^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/;

/**
 * @param {string} value
 * @returns {number|null} the finite number, or null when `value` is not a finite xsd:double
 */
export function parseXsdDouble(value) {
  if (!xsdDoubleRegex.test(value)) {
    return null;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
