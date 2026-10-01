import { QuestionType, ValidationError } from '../../constants';
import { parseXsdDouble } from '../../utils/math';
import { hasRichTextContent } from '../../utils/richText';

/**
 * Validate TextEntryState → ValidationError[].
 *
 * - numeric:      prompt required + at least one answer + each value a finite xsd:double
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

  if (!hasRichTextContent(prompt)) {
    errors.push({ code: ValidationError.PROMPT_REQUIRED });
  }

  if (questionType === QuestionType.NUMERIC || questionType === QuestionType.TEXT_ENTRY) {
    if (answers.length === 0) {
      errors.push({ code: ValidationError.NO_CORRECT_ANSWER });
    }

    const seen = new Set();

    for (const answer of answers) {
      const val = answer.value.trim();
      let lookupKey;

      if (questionType === QuestionType.NUMERIC) {
        const number = parseXsdDouble(val);
        if (number === null) {
          errors.push({ code: ValidationError.INVALID_NUMERIC_VALUE, id: answer.id });
        }
        // Invalid answers keep their text as key so two different ones don't collide.
        lookupKey = number ?? val;
      } else {
        if (!val) {
          errors.push({ code: ValidationError.EMPTY_ANSWER_CONTENT, id: answer.id });
        }
        const normalizedVal = answer.caseSensitive ? val : val.toLowerCase();
        lookupKey = `${normalizedVal}|${answer.caseSensitive}`;
      }

      if (val) {
        if (seen.has(lookupKey)) {
          errors.push({ code: ValidationError.DUPLICATE_ANSWER_CONTENT, id: answer.id });
        }
        seen.add(lookupKey);
      }
    }
  }

  return errors;
}
