/**
 * TEMPORARY WORKAROUND: Localizes mathlive's hardcoded English screen reader
 * announcements by post-processing the announcement text.
 *
 * Remove when upstream fix lands:
 * https://github.com/arnog/mathlive/issues/2948
 */

import camelCase from 'lodash/camelCase';
import translator from './MathLiveA11yStrings';

function translateRelationName(englishName) {
  const key = camelCase(englishName) + '$';
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
  const endOfMathfieldMatch = result.match(/^(.*?); end of mathfield$/);
  if (endOfMathfieldMatch) {
    const localized = translator.endOfMathfield$({ spokenText: endOfMathfieldMatch[1] });
    return hackMatch ? localized + hackMatch[0] : localized;
  }

  // Pattern: "out of <relation>;" (can appear multiple times)
  result = result.replace(/out of (.+?);/g, (_match, name) => {
    return translator.outOf$({ relationName: translateRelationName(name) });
  });

  // Pattern: "start of <relation>: "
  result = result.replace(/start of (.+?):[ ]?/, (_match, name) => {
    return translator.startOf$({ relationName: translateRelationName(name) });
  });

  // Pattern: "<spoken>; end of (.+)"
  result = result.replace(/(.*?); end of (.+)$/, (_match, spoken, name) => {
    return translator.endOf$({
      spokenText: spoken,
      relationName: translateRelationName(name),
    });
  });

  if (result === cleanText) return text;
  return hackMatch ? result + hackMatch[0] : result;
}
