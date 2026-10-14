import { NumberFormatter, NumberParser } from '@internationalized/number';
import { parseXsdDouble } from './math';

function readInLanguage(text, language) {
  const parser = new NumberParser(language);
  // `parse` alone takes JavaScript literals such as `0x10` and `Infinity`.
  if (!parser.isValidPartialNumber(text)) {
    return null;
  }
  const number = parser.parse(text);
  return Number.isFinite(number) ? number : null;
}

// `String(number)` writes an exponent below 1e-6 and from 1e21, which text typed without one
// shouldn't be stored or shown with. 21 significant digits shows every digit it would.
const PLAIN_OPTIONS = { useGrouping: false, maximumSignificantDigits: 21 };
const PLAIN_NUMBER = new Intl.NumberFormat('en', PLAIN_OPTIONS);

/**
 * Reads the canonical xsd:double out of `text` typed in `language`, or keeps `text` when it
 * is an xsd:double the language can't read, so French `1,5` reads as 1.5 and `1.50` as 1.50.
 * @param {string} text
 * @param {string} [language] - BCP 47 tag; falsy reads xsd:double only
 * @returns {string|null} The xsd:double, or null if it can't be read
 */
export function readLocaleNumber(text, language) {
  const trimmed = text.trim();
  // `NumberParser` reads a leading `+` only in some languages.
  const unsigned = trimmed.replace(/^\+(?![+-])/, '');
  const number = language ? readInLanguage(unsigned, language) : null;
  if (number !== null) {
    const canonical = String(number);
    return /e/.test(canonical) && !/e/i.test(trimmed) ? PLAIN_NUMBER.format(number) : canonical;
  }
  return parseXsdDouble(trimmed) === null ? null : trimmed;
}

/**
 * Formats a stored xsd:double for display in `language`, without grouping.
 * @param {string} value
 * @param {string} [language] - BCP 47 tag; falsy returns `value` unchanged
 * @returns {string} The formatted value; `value` unchanged if it is not an xsd:double, has
 *   an exponent, or the language can't read it back
 */
export function formatLocaleNumber(value, language) {
  const number = parseXsdDouble(value);
  if (!language || number === null || /e/i.test(value)) {
    return value;
  }
  // Without bidi marks: `ar-EG`'s U+061C would show the minus right of the number in the ltr
  // answer field.
  const formatted = new NumberFormatter(language, PLAIN_OPTIONS)
    // `-0` reads as 0, so it is shown as `0`.
    .format(number || 0)
    .replace(/\p{Cf}/gu, '');
  // Some languages (`sd`) use a decimal separator `NumberParser` reads as grouping.
  return parseXsdDouble(readLocaleNumber(formatted, language) ?? '') === number ? formatted : value;
}
