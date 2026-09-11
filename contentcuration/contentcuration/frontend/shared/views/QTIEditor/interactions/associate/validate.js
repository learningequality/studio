import flatten from 'lodash/flatten';
import { ValidationError } from '../../constants';
import { stripTags } from '../../utils/stripTags';

const text = content => stripTags(content).trim();

/**
 * Validate AssociateState → ValidationError[].
 *
 * Choice-scoped errors carry `id`; pair-scoped errors carry the pair's `index`,
 * because both members of a broken pair may be blank or share an id.
 *
 * @param {object} state - AssociateState
 * @returns {Array<{ code: string, id?: string, index?: number }>}
 */
export function validateAssociateInteraction(state) {
  const errors = [];
  const { prompt, pairs = [], distractors = [] } = state;

  if (!text(prompt)) {
    errors.push({ code: ValidationError.PROMPT_REQUIRED });
  }

  for (const { id, content } of [...flatten(pairs), ...distractors]) {
    if (!text(content)) {
      errors.push({ code: ValidationError.EMPTY_CHOICE_CONTENT, id });
    }
  }

  let validPairs = 0;
  pairs.forEach(([first, second], index) => {
    const [firstText, secondText] = [text(first.content), text(second.content)];
    if (!firstText || !secondText) {
      return;
    }
    if (firstText === secondText) {
      errors.push({ code: ValidationError.DUPLICATE_PAIR_CONTENT, index });
    } else {
      validPairs += 1;
    }
  });

  if (validPairs < 1) {
    errors.push({ code: ValidationError.TOO_FEW_PAIRS });
  }

  return errors;
}
