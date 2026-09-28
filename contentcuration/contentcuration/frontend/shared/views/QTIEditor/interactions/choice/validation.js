import { QuestionType, ValidationError } from '../../constants';
import { hasRichTextContent, richTextComparisonKey } from '../../utils/richText';

/**
 * Validate ChoiceState → ValidationError[].
 *
 * @param {object} state - ChoiceState
 * @param {string} questionType
 * @returns {Array<{ code: string, id?: string }>}
 */
export function validateChoiceInteraction(state, questionType) {
  const errors = [];
  const { prompt, choices } = state;

  if (!hasRichTextContent(prompt)) {
    errors.push({ code: ValidationError.PROMPT_REQUIRED });
  }

  // Map each comparison key → the id of the first choice that had it. When a later
  // choice matches, both ids are flagged as duplicates in O(1).
  const firstSeenId = new Map();
  const duplicateIds = new Set();

  for (const choice of choices) {
    if (!hasRichTextContent(choice.content)) {
      errors.push({ code: ValidationError.EMPTY_CHOICE_CONTENT, id: choice.id });
      continue;
    }

    const key = richTextComparisonKey(choice.content);
    if (firstSeenId.has(key)) {
      duplicateIds.add(firstSeenId.get(key));
      duplicateIds.add(choice.id);
    } else {
      firstSeenId.set(key, choice.id);
    }
  }

  for (const duplicateId of duplicateIds) {
    errors.push({ code: ValidationError.DUPLICATE_CHOICE_CONTENT, id: duplicateId });
  }

  const correctCount = choices.filter(a => a.correct).length;
  if (correctCount === 0) {
    errors.push({ code: ValidationError.NO_CORRECT_ANSWER });
  } else if (questionType === QuestionType.SINGLE_SELECT && correctCount > 1) {
    errors.push({ code: ValidationError.TOO_MANY_CORRECT_ANSWERS });
  }

  return errors;
}
