import { ValidationError } from '../../constants';
import { duplicateDistractorErrors } from '../../utils/distractors';
import { getGaps } from './parse';
import { richTextComparisonKey } from 'shared/views/TipTapEditor/TipTapEditor/utils/comparisonKey';

export function validateGapMatchInteraction(state) {
  const { passage, distractors = [] } = state;
  const gaps = getGaps(passage);
  if (gaps.length === 0) {
    return [{ code: ValidationError.NO_CORRECT_ANSWER }];
  }

  const read = (id, content) => {
    const key = richTextComparisonKey(content);
    return { id, filled: Boolean(key), key };
  };
  const readAnswers = gaps.map(({ id, answer }) => read(id, answer));
  const readDistractors = distractors.map(({ id, content }) => read(id, content));

  const errors = [];
  for (const { id, filled } of readAnswers) {
    if (!filled) {
      errors.push({ code: ValidationError.EMPTY_ANSWER_CONTENT, id });
    }
  }
  for (const { id, filled } of readDistractors) {
    if (!filled) {
      errors.push({ code: ValidationError.EMPTY_CHOICE_CONTENT, id });
    }
  }
  errors.push(...duplicateDistractorErrors(readAnswers, readDistractors));

  return errors;
}
