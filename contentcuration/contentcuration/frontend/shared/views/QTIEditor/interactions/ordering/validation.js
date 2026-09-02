import { ValidationError } from '../../constants';
import { stripTags } from '../../utils/stripTags';

/**
 * Validate OrderingState → ValidationError[].
 *
 * @param {object} state - OrderingState
 * @returns {Array<{ code: string, id?: string }>}
 */
export function validateOrderingInteraction(state) {
  const errors = [];
  const { prompt, items } = state;

  if (!stripTags(prompt).trim()) {
    errors.push({ code: ValidationError.PROMPT_REQUIRED });
  }

  if (items.length < 2) {
    errors.push({ code: ValidationError.TOO_FEW_CHOICES });
  }

  const firstSeenId = new Map();
  const duplicateIds = new Set();

  for (const item of items) {
    const textContent = stripTags(item.content).trim();
    if (!textContent) {
      errors.push({ code: ValidationError.EMPTY_CHOICE_CONTENT, id: item.id });
    } else if (firstSeenId.has(textContent)) {
      duplicateIds.add(firstSeenId.get(textContent));
      duplicateIds.add(item.id);
    } else {
      firstSeenId.set(textContent, item.id);
    }
  }

  for (const duplicateId of duplicateIds) {
    errors.push({ code: ValidationError.DUPLICATE_CHOICE_CONTENT, id: duplicateId });
  }

  return errors;
}
