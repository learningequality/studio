/**
 * QTISanitizer — input validation and sanitization at every data entry boundary.
 *
 * @module serialization/qti/QTISanitizer
 */

// Valid QTI 3.0 base-type values — https://www.imsglobal.org/spec/qti/v3p0/impl/#h.wq4e8lbs4wa9
const VALID_BASE_TYPES = new Set([
  'boolean',
  'directedPair',
  'duration',
  'file',
  'float',
  'identifier',
  'integer',
  'pair',
  'point',
  'string',
  'uri',
]);

// Valid QTI 3.0 cardinality values — https://www.imsglobal.org/spec/qti/v3p0/impl/#h.wq4e8lbs4wa9
const VALID_CARDINALITIES = new Set(['single', 'multiple', 'ordered', 'record']);

// QTI identifier pattern — Unicode-aware NCName (\w is ASCII-only in JS)
const IDENTIFIER_RE = /^[\p{L}_][\p{L}\p{N}_.-]*$/u;

export class QTISanitizer {
  /**
   * Validate a QTI base-type string.
   * Throws if the value is not in the spec-defined set.
   *
   * @param {string} baseType
   * @returns {string} The same value if valid
   * @throws {Error}
   */
  static validateBaseType(baseType) {
    if (baseType === null || baseType === undefined) return baseType;
    if (!VALID_BASE_TYPES.has(baseType)) {
      throw new Error(
        `QTISanitizer: invalid base-type "${baseType}". ` +
          `Must be one of: ${[...VALID_BASE_TYPES].join(', ')}.`,
      );
    }
    return baseType;
  }

  /**
   * Validate a QTI cardinality string.
   * Throws if the value is not in the spec-defined set.
   *
   * @param {string} cardinality
   * @returns {string} The same value if valid
   * @throws {Error}
   */
  static validateCardinality(cardinality) {
    if (!VALID_CARDINALITIES.has(cardinality)) {
      throw new Error(
        `QTISanitizer: invalid cardinality "${cardinality}". ` +
          `Must be one of: ${[...VALID_CARDINALITIES].join(', ')}.`,
      );
    }
    return cardinality;
  }

  /**
   * Validate a QTI identifier (NCName-based).
   * Throws if the value does not match the QTI identifier pattern.
   *
   * @param {string} identifier
   * @returns {string} The same value if valid
   * @throws {Error}
   */
  static validateIdentifier(identifier) {
    if (!identifier || !IDENTIFIER_RE.test(identifier)) {
      throw new Error(
        `QTISanitizer: invalid QTI identifier "${identifier}". ` +
          `Must start with a letter or underscore and contain only word characters, hyphens, or dots.`,
      );
    }
    return identifier;
  }

  /**
   * Strip HTML tags from a string value.
   *
   * @param {string} value - Raw string (identifier, float string, etc.)
   * @returns {string} Value with all HTML tags stripped and text content extracted
   */
  static stripTags(value) {
    if (typeof value !== 'string') return String(value ?? '');
    // Fast path: if no `<` is present there is nothing to strip.
    if (!value.includes('<')) return value;
    const doc = new DOMParser().parseFromString(value, 'text/html');
    // Remove script and style elements entirely — we do NOT want their text content.
    doc.querySelectorAll('script, style').forEach(el => el.remove());
    return doc.body.textContent ?? '';
  }

  /**
   * Parse a string as a float and validate it is a finite number.
   * Throws if the value is not a valid finite number.
   *
   * @param {string|number} value
   * @param {string} [fieldName] - Label for error messages
   * @returns {number}
   * @throws {Error}
   */
  static parseFloat(value, fieldName = 'value') {
    const n = Number(value);
    if (!isFinite(n)) {
      throw new Error(`QTISanitizer: "${fieldName}" must be a finite number, got "${value}".`);
    }
    return n;
  }

  /**
   * Sanitize an array of string values (e.g. correctResponse, defaultValue).
   * Trims whitespace and strips HTML tags from each entry.
   * Removes entries that are empty after sanitization.
   *
   * @param {string[]} values
   * @returns {string[]}
   */
  static sanitizeValues(values) {
    return values.map(v => QTISanitizer.stripTags(String(v).trim())).filter(v => v.length > 0);
  }
}
