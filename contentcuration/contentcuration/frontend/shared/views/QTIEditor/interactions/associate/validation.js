import countBy from 'lodash/countBy';
import flatten from 'lodash/flatten';
import { ValidationError } from '../../constants';
import { duplicateDistractorErrors } from '../../utils/distractors';
import {
  hasRichTextContent,
  richTextComparisonKey,
} from 'shared/views/TipTapEditor/TipTapEditor/utils/comparisonKey';

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

  const read = ({ id, content }) => {
    const key = richTextComparisonKey(content);
    return { id, filled: Boolean(key), key };
  };
  const readPairs = pairs.map(pair => pair.map(read));
  const readDistractors = distractors.map(read);
  const allChoices = [...flatten(readPairs), ...readDistractors];

  for (const { id, filled } of allChoices) {
    if (!filled) {
      errors.push({ code: ValidationError.EMPTY_CHOICE_CONTENT, id });
    }
  }

  const validPairs = [];
  readPairs.forEach(([first, second], index) => {
    if (!first.filled || !second.filled) {
      return;
    }
    if (first.key === second.key) {
      errors.push({ code: ValidationError.DUPLICATE_PAIR_CONTENT, index });
    } else {
      validPairs.push({ index, key: JSON.stringify([first.key, second.key].sort()) });
    }
  });

  if (validPairs.length < 1) {
    errors.push({ code: ValidationError.TOO_FEW_PAIRS });
  }

  const pairKeyCounts = countBy(validPairs, 'key');
  for (const { index, key } of validPairs) {
    if (pairKeyCounts[key] > 1) {
      errors.push({ code: ValidationError.REPEATED_PAIR, index });
    }
  }

  // A distractor is there to be the wrong answer, so repeating another
  // distractor or an item the author already paired makes it unanswerable.
  errors.push(...duplicateDistractorErrors(flatten(readPairs), readDistractors));

  return errors;
}
