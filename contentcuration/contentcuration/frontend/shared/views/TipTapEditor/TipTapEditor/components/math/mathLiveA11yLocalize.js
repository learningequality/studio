/**
 * TEMPORARY WORKAROUND: Localizes mathlive's hardcoded English screen reader
 * announcements by post-processing the announcement text.
 *
 * Remove when upstream fix lands:
 * https://github.com/arnog/mathlive/issues/2948
 */

import translator, { RELATION_NAMES } from './MathLiveA11yStrings';

/**
 * Convert an English relation name to its camelCase translator key.
 * e.g. "square root" -> "squareRoot$", "subscript-superscript" -> "subscriptSuperscript$"
 */
function toTranslatorKey(str) {
  return (
    str
      .split(/[\s-]+/)
      .map((word, i) =>
        i === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
      )
      .join('') + '$'
  );
}

// Build regex that matches any English relation name
const RELATION_NAMES_PATTERN = RELATION_NAMES.map(name =>
  name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
).join('|');

// Pre-compiled regexes for hot-path use in localizeAnnouncement()
const OUT_OF_REGEX = new RegExp(`out of (${RELATION_NAMES_PATTERN});`, 'g');
const START_OF_REGEX = new RegExp(`start of (${RELATION_NAMES_PATTERN}):[ ]?`);
const END_OF_MATHFIELD_REGEX = /^(.*?); end of mathfield$/;
const END_OF_REGEX = new RegExp(`(.*?); end of (${RELATION_NAMES_PATTERN})$`);

function translateRelationName(englishName) {
  const key = toTranslatorKey(englishName);
  if (translator[key]) {
    return translator[key]();
  }
  return englishName;
}

// Mathlive appends alternating " \u00A0 " / " \u202F " to force aria-live change detection
const MATHLIVE_HACK_REGEX = / [\u00A0\u202F] $/;

/**
 * Localize a mathlive announcement string by replacing known English patterns
 * with their translated equivalents. Preserves mathlive's trailing aria-live
 * change hack if present.
 *
 * @param {string} text - The English announcement text from mathlive
 * @returns {string} The localized announcement text
 */
export function localizeAnnouncement(text) {
  if (!text) return text;

  const hackMatch = text.match(MATHLIVE_HACK_REGEX);
  const cleanText = hackMatch ? text.slice(0, -hackMatch[0].length) : text;
  if (!cleanText) return text;

  let result = cleanText;

  // Pattern: "deleted: <content>" -> translated prefix + content
  result = result.replace(/^deleted: /, () => translator.deleted$());

  // Pattern: "selected: <content>" -> translated prefix + content
  result = result.replace(/^selected: /, () => translator.selected$());

  // Pattern: "<spoken>; end of mathfield" (must check before generic "end of")
  const endOfMathfieldMatch = result.match(END_OF_MATHFIELD_REGEX);
  if (endOfMathfieldMatch) {
    const localized = translator.endOfMathfield$({ spokenText: endOfMathfieldMatch[1] });
    return hackMatch ? localized + hackMatch[0] : localized;
  }

  // Pattern: "out of <relation>;" (can appear multiple times)
  OUT_OF_REGEX.lastIndex = 0;
  result = result.replace(OUT_OF_REGEX, (_match, name) => {
    return translator.outOf$({ relationName: translateRelationName(name) });
  });

  // Pattern: "start of <relation>: "
  result = result.replace(START_OF_REGEX, (_match, name) => {
    return translator.startOf$({ relationName: translateRelationName(name) });
  });

  // Pattern: "<spoken>; end of <relation>"
  result = result.replace(END_OF_REGEX, (_match, spoken, name) => {
    return translator.endOf$({
      spokenText: spoken,
      relationName: translateRelationName(name),
    });
  });

  if (result === cleanText) return text;
  return hackMatch ? result + hackMatch[0] : result;
}
