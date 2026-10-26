import { ValidationError } from '../../constants';
import {
  hasRichTextContent,
  richTextComparisonKey,
} from 'shared/views/TipTapEditor/TipTapEditor/utils/comparisonKey';

/**
 * Validate OrderingState → ValidationError[].
 *
 * @param {object} state - OrderingState
 * @returns {Array<{ code: string, id?: string }>}
 */
export function validateOrderingInteraction(state) {
  const errors = [];
  const { prompt, items } = state;

  if (!hasRichTextContent(prompt)) {
    errors.push({ code: ValidationError.PROMPT_REQUIRED });
  }

  if (items.length < 2) {
    errors.push({ code: ValidationError.TOO_FEW_CHOICES });
  }

  const firstSeenId = new Map();
  const duplicateIds = new Set();

  for (const item of items) {
    const key = richTextComparisonKey(item.content);
    if (!key) {
      errors.push({ code: ValidationError.EMPTY_CHOICE_CONTENT, id: item.id });
      continue;
    }

    if (firstSeenId.has(key)) {
      duplicateIds.add(firstSeenId.get(key));
      duplicateIds.add(item.id);
    } else {
      firstSeenId.set(key, item.id);
    }
  }

  for (const duplicateId of duplicateIds) {
    errors.push({ code: ValidationError.DUPLICATE_CHOICE_CONTENT, id: duplicateId });
  }

  return errors;
}
