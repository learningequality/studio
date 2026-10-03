/**
 * Taken from kolibri-common/utils/numeralNormalization.js
 * (learningequality/kolibri@d74be371c).
 */

// Matches any Unicode decimal digit that is NOT ASCII 0-9.
// \p{Nd} = Unicode "Decimal_Digit_Number" category (all scripts).
// [0-9] is excluded so we only process non-Western digits.
const nonWesternDigitRegex = /(?![0-9])\p{Nd}/gu;

// Single-character test for any decimal digit (used in the base-finding loop).
const singleNdRegex = /\p{Nd}/u;

/**
 * Replace any non-Western digit character with its ASCII equivalent.
 *
 * Unicode guarantees that decimal digits 0-9 are contiguous in every
 * script. We find the block's "zero" by walking backwards (at most 9
 * steps), then subtract to get the digit value.
 * @param {string} str - String that may contain non-Western digits
 * @returns {string} The string with non-Western digits converted to ASCII
 */
function normalizeNumerals(str) {
  if (typeof str !== 'string') {
    return str;
  }
  return str.replace(nonWesternDigitRegex, char => {
    const code = char.codePointAt(0);
    // Walk backwards to find the first character in this digit block
    // (i.e., the script's "zero"). At most 9 steps.
    let base = code;
    while (base > 0 && singleNdRegex.test(String.fromCodePoint(base - 1))) {
      base--;
    }
    return String(code - base);
  });
}

// Cache for getLocalizedDigits — keyed by locale string.
const _digitCache = {};

/**
 * Get the localized digits 0-9 for a locale using Intl.NumberFormat.
 * Returns null if the locale's digits are identical to ASCII 0-9
 * (meaning no character remapping is needed for display or input).
 * Otherwise returns an array of 10 strings representing digits 0-9.
 * Results are cached per locale.
 * @param {string} locale - BCP 47 locale code
 * @returns {string[]|null} Locale digits 0-9; null for ASCII
 */
function getLocalizedDigits(locale) {
  if (!locale) {
    return null;
  }
  if (locale in _digitCache) {
    return _digitCache[locale];
  }
  try {
    const formatter = new Intl.NumberFormat(locale, { useGrouping: false });
    const digits = [];
    for (let i = 0; i < 10; i++) {
      digits.push(formatter.format(i));
    }
    // If all digits match ASCII, no remapping is needed
    const result = digits.every((d, i) => d === String(i)) ? null : digits;
    _digitCache[locale] = result;
    return result;
  } catch (e) {
    _digitCache[locale] = null;
    return null;
  }
}

/**
 * Convert ASCII digits in a string to localized digits for a given locale.
 * The reverse of normalizeNumerals: "42" → "٤٢" for Arabic.
 * Returns the string unchanged if the locale's digits match ASCII.
 * @param {string} str - String whose ASCII digits to localize
 * @param {string} locale - BCP 47 locale code
 * @returns {string} Localized string
 */
function localizeNumerals(str, locale) {
  if (typeof str !== 'string') {
    return str;
  }
  const digits = getLocalizedDigits(locale);
  if (!digits) {
    return str;
  }
  return str.replace(/[0-9]/g, d => digits[Number(d)]);
}

export { normalizeNumerals, localizeNumerals };
