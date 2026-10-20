import { ValidationError } from '../../constants';
import { hasRichTextContent } from '../../utils/richText';
import { getGaps } from './parse';
import { richTextComparisonKey } from 'shared/views/TipTapEditor/TipTapEditor/utils/comparisonKey';

export function validateGapMatchInteraction(state) {
  const { passage, distractors = [] } = state;
  const gaps = getGaps(passage);
  if (gaps.length === 0) {
    return [{ code: ValidationError.NO_CORRECT_ANSWER }];
  }

  const errors = [];
  const filledKeys = [];
  for (const { id, answer } of gaps) {
    if (hasRichTextContent(answer)) {
      filledKeys.push(richTextComparisonKey(answer));
    } else {
      errors.push({ code: ValidationError.EMPTY_ANSWER_CONTENT, id });
    }
  }

  const distractorKeys = [];
  for (const { id, content } of distractors) {
    if (hasRichTextContent(content)) {
      distractorKeys.push(richTextComparisonKey(content));
    } else {
      errors.push({ code: ValidationError.EMPTY_CHOICE_CONTENT, id });
    }
  }

  const answerKeys = new Set(filledKeys);
  const seen = new Set();
  const repeated = new Set();
  for (const key of distractorKeys) {
    if (answerKeys.has(key) || seen.has(key)) repeated.add(key);
    seen.add(key);
  }
  for (const text of repeated) {
    errors.push({ code: ValidationError.DUPLICATE_DISTRACTOR_CONTENT, text });
  }

  return errors;
}
