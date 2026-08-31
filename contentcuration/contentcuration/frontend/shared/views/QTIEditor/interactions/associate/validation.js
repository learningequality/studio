import flatten from 'lodash/flatten';
import { ValidationError } from '../../constants';
import { hasRichTextContent, richTextComparisonKey } from '../../utils/richText';

/**
 * Validate AssociateState → ValidationError[].
 *
 * Choice-scoped errors carry `id`; pair-scoped errors carry the pair's `index`,
 * because both members of a broken pair may be blank or share an id;
 * duplication errors carry the repeated `text`, because an id may be repeated
 * across choices and so cannot single one out.
 *
 * @param {object} state - AssociateState
 * @returns {Array<{ code: string, id?: string, index?: number, text?: string }>}
 */
export function validateAssociateInteraction(state) {
  const errors = [];
  const { prompt, pairs = [], distractors = [] } = state;

  if (!hasRichTextContent(prompt)) {
    errors.push({ code: ValidationError.PROMPT_REQUIRED });
  }

  // Every rule below asks the same two questions of a choice, and answering
  // either one parses its HTML — so each choice is read once, here.
  const read = ({ id, content }) => ({
    id,
    filled: hasRichTextContent(content),
    key: richTextComparisonKey(content),
  });
  const readPairs = pairs.map(pair => pair.map(read));
  const readDistractors = distractors.map(read);
  const allChoices = [...flatten(readPairs), ...readDistractors];

  for (const { id, filled } of allChoices) {
    if (!filled) {
      errors.push({ code: ValidationError.EMPTY_CHOICE_CONTENT, id });
    }
  }

  let validPairs = 0;
  readPairs.forEach(([first, second], index) => {
    if (!first.filled || !second.filled) {
      return;
    }
    if (first.key === second.key) {
      errors.push({ code: ValidationError.DUPLICATE_PAIR_CONTENT, index });
    } else {
      validPairs += 1;
    }
  });

  if (validPairs < 1) {
    errors.push({ code: ValidationError.TOO_FEW_PAIRS });
  }

  // A distractor is there to be the wrong answer, so repeating another
  // distractor or an item the author already paired makes it unanswerable.
  // Content reused across two pairs stays valid — only distractors are flagged.
  const occurrences = new Map();
  for (const { filled, key } of allChoices) {
    if (filled) {
      occurrences.set(key, (occurrences.get(key) || 0) + 1);
    }
  }

  const repeated = new Set(
    readDistractors
      .filter(({ filled, key }) => filled && occurrences.get(key) > 1)
      .map(({ key }) => key),
  );
  for (const text of repeated) {
    errors.push({ code: ValidationError.DUPLICATE_DISTRACTOR_CONTENT, text });
  }

  return errors;
}
