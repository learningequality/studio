import { ValidationError } from '../constants';

/**
 * A distractor must differ from every answer and from every other distractor. Answers can
 * repeat each other, because one answer can be correct in more than one place.
 *
 * @param {Array<{ filled: boolean, key: string }>} readAnswers - The answers, each read as
 *   whether it has content and its comparison key
 * @param {Array<{ filled: boolean, key: string }>} readDistractors - The distractors, read
 *   the same way
 * @returns {Array<{ code: string, text: string }>} One error for each repeated distractor key
 */
export function duplicateDistractorErrors(readAnswers, readDistractors) {
  const filledKeys = readChoices =>
    readChoices.filter(({ filled }) => filled).map(({ key }) => key);
  const distractorKeys = filledKeys(readDistractors);

  const counts = new Map();
  for (const key of [...filledKeys(readAnswers), ...distractorKeys]) {
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const repeated = new Set(distractorKeys.filter(key => counts.get(key) > 1));
  return [...repeated].map(text => ({ code: ValidationError.DUPLICATE_DISTRACTOR_CONTENT, text }));
}
