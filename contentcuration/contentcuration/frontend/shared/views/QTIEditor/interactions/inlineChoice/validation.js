import { ValidationError } from '../../constants';
import { getDropdowns } from './parse';

/**
 * Validate InlineChoiceState → ValidationError[]. Option errors carry the choice id,
 * dropdown errors the response identifier.
 *
 * @param {InlineChoiceState} state
 * @returns {Array<{ code: string, id?: string }>}
 */
export function validateInlineChoiceInteraction(state) {
  const dropdowns = getDropdowns(state.passage);
  if (dropdowns.length === 0) {
    return [{ code: ValidationError.NO_INTERACTION }];
  }

  const errors = [];
  for (const { responseIdentifier, options, correctId } of dropdowns) {
    const firstSeenId = new Map();
    const duplicateIds = new Set();

    for (const option of options) {
      const text = option.text.trim();
      if (!text) {
        errors.push({ code: ValidationError.EMPTY_CHOICE_CONTENT, id: option.id });
        continue;
      }
      if (firstSeenId.has(text)) {
        duplicateIds.add(firstSeenId.get(text));
        duplicateIds.add(option.id);
      } else {
        firstSeenId.set(text, option.id);
      }
    }

    for (const id of duplicateIds) {
      errors.push({ code: ValidationError.DUPLICATE_CHOICE_CONTENT, id });
    }

    if (correctId === null) {
      errors.push({ code: ValidationError.NO_CORRECT_ANSWER, id: responseIdentifier });
    }
  }

  return errors;
}
