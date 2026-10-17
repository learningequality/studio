import { ConversionLoss } from '../constants';
import { parseXML } from '../serialization/xml';
import { hasRichTextContent } from '../utils/richText';
import { changeLevel, hasContent } from './content';

/**
 * @typedef {object} Passage - The `passage` facet: rich text with answer blanks in it
 * @property {string} html - The passage, with a `<span data-blank="i">` where blank `i` sits.
 *   A neutral placeholder, so no passage type needs to know another's node markup.
 * @property {Array<{ answer: string|null, options: string[] }>} blanks - Each blank's
 *   correct answer, null when it has none, and its own wrong options
 * @property {string[]} distractors - Wrong answers shared by every blank
 * @property {string} level - ContentLevel of the answers, options and distractors
 * @property {boolean} [shuffle] - Only from a type whose author can change it
 */

export const BLANK_ATTR = 'data-blank';

/** How a blank reads once its passage is part of the question. Not a word, so not translated. */
export const BLANK_TEXT = '_____';

/**
 * @param {string} html
 * @returns {HTMLElement} The `<body>` of a document holding the HTML
 */
export function parsePassageHTML(html) {
  return parseXML(`<!DOCTYPE html><body>${html ?? ''}</body>`, 'text/html').body;
}

/**
 * Whether the passage says anything: its own text or media, or anything in its blanks.
 *
 * @param {Passage} passage
 * @returns {boolean}
 */
export function passageHasContent(passage) {
  const has = content => hasContent(content, passage.level);
  return (
    hasRichTextContent(passage.html) ||
    passage.blanks.some(blank => has(blank.answer) || blank.options.some(has)) ||
    passage.distractors.some(has)
  );
}

/**
 * The question with the passage added after it, each blank shown as BLANK_TEXT, for a
 * question type with no passage. The blanks' answers go: there is nowhere to put them.
 *
 * @param {string} prompt - The question's HTML
 * @param {string} html - Passage.html
 * @returns {string}
 */
export function foldPassage(prompt, html) {
  const body = parsePassageHTML(html);
  for (const blank of body.querySelectorAll(`[${BLANK_ATTR}]`)) {
    blank.replaceWith(BLANK_TEXT);
  }
  return `${prompt ?? ''}${body.innerHTML}`;
}

/**
 * Carry a passage to the level another passage type holds its answers at.
 *
 * @param {Passage} passage
 * @param {{ level: string }} format
 * @returns {{ passage: Passage, losses: string[] }} `losses` are ConversionLoss codes
 */
export function carryPassage(passage, format) {
  let lost = false;
  const move = content => {
    const moved = changeLevel(content, passage.level, format.level);
    lost = lost || moved.lost;
    return hasContent(moved.content, format.level) ? moved.content : null;
  };
  const present = content => content !== null;

  const blanks = passage.blanks.map(({ answer, options }) => ({
    answer: answer === null ? null : move(answer),
    options: options.map(move).filter(present),
  }));
  const distractors = passage.distractors.map(move).filter(present);

  return {
    passage: { ...passage, level: format.level, blanks, distractors },
    losses: lost ? [ConversionLoss.FORMATTING_REMOVED] : [],
  };
}
