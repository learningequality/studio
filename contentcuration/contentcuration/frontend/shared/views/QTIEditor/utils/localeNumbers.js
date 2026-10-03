import { parseXsdDouble } from './math';
import { localizeNumerals, normalizeNumerals } from './numerals';

// Space, no-break space and narrow no-break space look alike, so authors can't tell them apart.
const spaceRegex = /[ \u00A0\u202F]/;

const conventionsCache = new Map();

function numberConventions(language) {
  if (!conventionsCache.has(language)) {
    const parts = new Intl.NumberFormat(language).formatToParts(1234567890.5);
    const group = parts.find(p => p.type === 'group')?.value;
    const groupSizes = parts.filter(p => p.type === 'integer').map(p => p.value.length);
    conventionsCache.set(language, {
      decimal: parts.find(p => p.type === 'decimal').value,
      group: spaceRegex.test(group) ? spaceRegex : group,
      primarySize: groupSizes[groupSizes.length - 1],
      secondarySize: groupSizes[groupSizes.length - 2],
    });
  }
  return conventionsCache.get(language);
}

function ungroup(integer, { group, primarySize, secondarySize }) {
  const groups = integer.split(group);
  if (groups.length === 1) {
    return /^\d*$/.test(integer) ? integer : null;
  }
  const first = groups[0];
  const middle = groups.slice(1, -1);
  const last = groups[groups.length - 1];
  const grouped =
    /^[1-9]\d*$/.test(first) &&
    groups.every(g => /^\d+$/.test(g)) &&
    first.length <= secondarySize &&
    middle.every(g => g.length === secondarySize) &&
    last.length === primarySize;
  return grouped ? groups.join('') : null;
}

// Arabic decimal and thousands separators, typed with Arabic-Indic digits even where `Intl`
// gives the language Latin conventions (`ar`).
function readArabicSeparators(text, { decimal, group }) {
  return text
    .replace(/\u066B/g, decimal)
    .replace(/\u066C/g, typeof group === 'string' ? group : ' ');
}

function readInLanguage(text, language) {
  const conventions = numberConventions(language);
  const [, sign, mantissa, exponent = ''] = /^([+-]?)([^eE]*)([eE].*)?$/.exec(
    readArabicSeparators(normalizeNumerals(text.trim()), conventions),
  );
  const [integer, ...fraction] = mantissa.split(conventions.decimal);
  const digits = ungroup(integer, conventions);
  if (digits === null || fraction.length > 1) {
    return null;
  }
  return sign + digits + (fraction.length ? `.${fraction[0]}` : '') + exponent;
}

function isXsdDouble(value) {
  return value !== null && parseXsdDouble(value) !== null;
}

/**
 * Reads the canonical xsd:double out of `text` typed in `language`, or as xsd:double when
 * the language can't read it and it has no group separator, so German `1.5` isn't read.
 * @param {string} text
 * @param {string} [language] - BCP 47 tag; falsy reads xsd:double only
 * @returns {string|null} The canonical value, or null if it can't be read
 */
export function readLocaleNumber(text, language) {
  const trimmed = text.trim();
  if (!language) {
    return isXsdDouble(trimmed) ? trimmed : null;
  }
  const value = readInLanguage(text, language);
  if (isXsdDouble(value)) {
    return value;
  }
  const { group } = numberConventions(language);
  const grouped = typeof group === 'string' ? trimmed.includes(group) : group.test(trimmed);
  return !grouped && isXsdDouble(trimmed) ? trimmed : null;
}

/**
 * Formats a stored xsd:double for display in `language`.
 * @param {string} value
 * @param {string} [language] - BCP 47 tag; falsy returns `value` unchanged
 * @returns {string} The formatted value; `value` unchanged if it is not an xsd:double
 */
export function formatLocaleNumber(value, language) {
  if (!language || !isXsdDouble(value)) {
    return value;
  }
  return localizeNumerals(value.replace('.', numberConventions(language).decimal), language);
}
