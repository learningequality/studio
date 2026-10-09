import memoize from 'lodash/memoize';
import { NumberFormatter, NumberParser } from '@internationalized/number';
import { parseXsdDouble } from './math';

// Languages whose own digits `Intl` doesn't use by default.
const OWN_NUMBERING_SYSTEMS = {
  ar: 'arab',
  bo: 'tibt',
  gu: 'gujr',
  hi: 'deva',
  km: 'khmr',
  kn: 'knda',
  lo: 'laoo',
  ml: 'mlym',
  or: 'orya',
  pa: 'guru',
  ta: 'tamldec',
  te: 'telu',
  th: 'thai',
  ur: 'arabext',
};

const ownDigits = memoize(language => {
  const numberingSystem =
    OWN_NUMBERING_SYSTEMS[new Intl.Locale(language).language] ??
    new Intl.NumberFormat(language).resolvedOptions().numberingSystem;
  const format = new Intl.NumberFormat('en', { numberingSystem });
  return {
    numberingSystem,
    ownLocale: new Intl.Locale(language, { numberingSystem }).toString(),
    digits: [...Array(10).keys()].map(digit => format.format(digit)),
  };
});

function readInLanguage(text, language) {
  const parser = new NumberParser(language);
  // `parse` alone takes JavaScript literals such as `0x10` and `Infinity`.
  if (!parser.isValidPartialNumber(text)) {
    return null;
  }
  const number = parser.parse(text);
  return Number.isFinite(number) ? number : null;
}

// `NumberParser` reads only some numbering systems (not Thai or Tamil), and reads Arabic
// separators only with Arabic digits. ASCII digits are read as own digits when either is there.
function readInOwnDigits(text, language) {
  const { numberingSystem, ownLocale, digits } = ownDigits(language);
  const owned = text.replace(/[0-9]/g, digit => digits[digit]);
  if ([...text].some(char => digits.includes(char))) {
    return (
      readInLanguage(owned, ownLocale) ??
      readInLanguage(
        owned.replace(/\p{Nd}/gu, digit => {
          const value = digits.indexOf(digit);
          return value < 0 ? digit : value;
        }),
        language,
      )
    );
  }
  if (/^(arab|arabext)$/.test(numberingSystem) && /[٫٬]/.test(text)) {
    return readInLanguage(owned, ownLocale);
  }
  return null;
}

// `NumberParser` strips a period group separator wherever it appears, but a period after no
// nonzero digit, or not followed by exactly three digits, can't be grouping.
function isUngroupedXsdDouble(text) {
  return parseXsdDouble(text) !== null && /^[+-]?0*\.|\.(?!\d{3}(?!\d))/.test(text);
}

// `String(number)` writes an exponent below 1e-6 and from 1e21, which text typed without one
// shouldn't be stored or shown with. 21 significant digits shows every digit it would.
const PLAIN_NUMBER = new Intl.NumberFormat('en', {
  useGrouping: false,
  maximumSignificantDigits: 21,
});

/**
 * Reads the canonical xsd:double out of `text` typed in `language`, or keeps `text` when it
 * is an xsd:double the language can't read, so French `1,5` reads as 1.5 and `1.50` as 1.50.
 * An xsd:double whose period can't be grouping is kept too, so German `0.5` reads as 0.5.
 * @param {string} text
 * @param {string} [language] - BCP 47 tag; falsy reads xsd:double only
 * @returns {string|null} The xsd:double, or null if it can't be read
 */
export function readLocaleNumber(text, language) {
  const trimmed = text.trim();
  // `NumberParser` reads a leading `+` only in some languages.
  const unsigned = trimmed.replace(/^\+(?![+-])/, '');
  const number =
    language && !isUngroupedXsdDouble(trimmed)
      ? (readInLanguage(unsigned, language) ?? readInOwnDigits(unsigned, language))
      : null;
  if (number !== null) {
    const canonical = String(number);
    return /e/.test(canonical) && !/e/i.test(trimmed) ? PLAIN_NUMBER.format(number) : canonical;
  }
  return parseXsdDouble(trimmed) === null ? null : trimmed;
}

/**
 * Keeps an answer's stored form while its text reads as the same number, so showing or saving
 * an unchanged answer changes nothing.
 * @param {string} read - The xsd:double the answer's text reads as
 * @param {string} [stored] - The xsd:double the answer is stored as
 * @returns {string}
 */
export function keepStoredNumber(read, stored) {
  return stored !== undefined && parseXsdDouble(stored) === parseXsdDouble(read) ? stored : read;
}

const languageSymbols = memoize(language => {
  const formatter = new NumberFormatter(language);
  const digits = [...Array(10).keys()].map(digit => formatter.format(digit));
  return {
    // Without its bidi marks: `ar-EG`'s U+061C would show the minus right of the number in
    // the ltr answer field.
    minus: formatter
      .format(-1)
      .replace(digits[1], '')
      .replace(/\p{Cf}/gu, ''),
    decimal: formatter.formatToParts(0.5).find(p => p.type === 'decimal').value,
    digits,
  };
});

/**
 * Writes a stored xsd:double in `language`'s digits, decimal separator and minus sign,
 * keeping its form (`1.50` stays `1,50` in French).
 * @param {string} value
 * @param {string} [language] - BCP 47 tag; falsy returns `value` unchanged
 * @returns {string} The written value; `value` unchanged if it is not an xsd:double, has
 *   an exponent, or the language can't read it back
 */
export function formatLocaleNumber(value, language) {
  const number = parseXsdDouble(value);
  if (!language || number === null || /e/i.test(value)) {
    return value;
  }
  const { minus, decimal, digits } = languageSymbols(language);
  const formatted = value
    .replace(/[0-9.]/g, char => (char === '.' ? decimal : digits[char]))
    .replace(/^-/, minus);
  // Some languages (`sd`) use a decimal separator `NumberParser` reads as grouping.
  return parseXsdDouble(readLocaleNumber(formatted, language) ?? '') === number ? formatted : value;
}
