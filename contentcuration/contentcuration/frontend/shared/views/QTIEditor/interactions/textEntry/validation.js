import { QuestionType, ValidationError } from '../../constants';
import { parseXsdDouble } from '../../utils/math';
import { readLocaleNumber } from '../../utils/localeNumbers';
import { hasRichTextContent } from '../../utils/richText';

/**
 * Validate TextEntryState → ValidationError[].
 *
 * - numeric:      prompt required + at least one answer + each value a finite number in `language`
 * - textEntry:    prompt required + at least one answer (any non-blank string)
 * - freeResponse: prompt required only
 *
 * @param {TextEntryState} state
 * @param {string} questionType
 * @param {{ language?: string }} [options] - Numeric answers are read in `language`; with
 *   none they must be xsd:double
 * @returns {Array<{ code: string, id?: string }>}
 */
export function validateTextEntryInteraction(state, questionType, { language } = {}) {
  const errors = [];
  const { prompt, answers } = state;

  if (!hasRichTextContent(prompt)) {
    errors.push({ code: ValidationError.PROMPT_REQUIRED });
  }

  if (questionType === QuestionType.NUMERIC || questionType === QuestionType.TEXT_ENTRY) {
    if (answers.length === 0) {
      errors.push({ code: ValidationError.NO_CORRECT_ANSWER });
    }

    // A later match flags the first answer too.
    const firstSeenId = new Map();
    const duplicateIds = new Set();

    for (const answer of answers) {
      const val = answer.value.trim();
      let lookupKey;

      if (questionType === QuestionType.NUMERIC) {
        const canonical = readLocaleNumber(val, language);
        const number = canonical === null ? null : parseXsdDouble(canonical);
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
        if (firstSeenId.has(lookupKey)) {
          duplicateIds.add(firstSeenId.get(lookupKey));
          duplicateIds.add(answer.id);
        } else {
          firstSeenId.set(lookupKey, answer.id);
        }
      }
    }

    for (const duplicateId of duplicateIds) {
      errors.push({ code: ValidationError.DUPLICATE_ANSWER_CONTENT, id: duplicateId });
    }
  }

  return errors;
}
