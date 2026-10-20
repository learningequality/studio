import { ValidationError } from '../constants';

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
