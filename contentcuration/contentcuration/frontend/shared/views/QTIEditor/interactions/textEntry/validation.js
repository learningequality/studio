import { QuestionType, ValidationError } from '../../constants';
import { QTISanitizer } from '../../serialization/qti/QTISanitizer';
import { floatOrIntRegex } from '../../utils/math';

/**
 * Validate TextEntryState → ValidationError[].
 *
 * - numeric:      prompt required + at least one answer + each value must be a valid number
 * - textEntry:    prompt required + at least one answer (any non-blank string)
 * - freeResponse: prompt required only
 *
 * @param {TextEntryState} state
 * @param {string} questionType
 * @returns {Array<{ code: string, id?: string }>}
 */
export function validateTextEntryInteraction(state, questionType) {
  const errors = [];
  const { prompt, answers } = state;

  if (!QTISanitizer.stripTags(prompt).trim()) {
    errors.push({ code: ValidationError.PROMPT_REQUIRED });
  }

  if (questionType === QuestionType.NUMERIC) {
    if (answers.length === 0) {
      errors.push({ code: ValidationError.NO_CORRECT_ANSWER });
    }

    for (const answer of answers) {
      if (!floatOrIntRegex.test(answer.value.trim())) {
        errors.push({ code: ValidationError.INVALID_NUMERIC_VALUE, id: answer.id });
      }
    }
  }

  if (questionType === QuestionType.TEXT_ENTRY) {
    if (answers.length === 0) {
      errors.push({ code: ValidationError.NO_CORRECT_ANSWER });
    }

    for (const answer of answers) {
      if (!answer.value.trim()) {
        errors.push({ code: ValidationError.EMPTY_ANSWER_CONTENT, id: answer.id });
      }
    }
  }

  return errors;
}
