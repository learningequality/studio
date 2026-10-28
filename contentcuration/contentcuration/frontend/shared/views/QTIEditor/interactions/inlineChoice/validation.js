import { ValidationError } from '../../constants';
import { getDropdowns } from './parse';

/** The fewest options a dropdown can have: with one, the learner has nothing to choose. */
export const MIN_OPTIONS = 2;

/**
 * What a dropdown as a whole lacks, rather than one of its options, in the order its options
 * panel lists them; its chip shows the first.
 *
 * @param {{ options: Array, correctId: string|null }} dropdown
 * @returns {string[]} ValidationError codes
 */
export function dropdownErrors({ options, correctId }) {
  const codes = [];
  if (correctId === null) codes.push(ValidationError.NO_CORRECT_ANSWER);
  if (options.length < MIN_OPTIONS) codes.push(ValidationError.TOO_FEW_CHOICES);
  return codes;
}

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
  for (const dropdown of dropdowns) {
    const { responseIdentifier, options } = dropdown;
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

    for (const code of dropdownErrors(dropdown)) {
      errors.push({ code, id: responseIdentifier });
    }
  }

  return errors;
}
