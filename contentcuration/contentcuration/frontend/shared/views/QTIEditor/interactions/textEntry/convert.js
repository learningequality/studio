import { AnswerKey, ContentLevel, QuestionType } from '../../constants';
import { generateRandomSlug } from '../../utils/generateRandomSlug';
import { _defaultState } from './parse';

/**
 * Converting a numeric, text entry or free response question to and from other question
 * types (see conversion/). A free response has no answers to give or take.
 */

const takesAnswers = questionType => questionType !== QuestionType.FREE_RESPONSE;

/**
 * @param {string} questionType
 * @returns {import('../../conversion').ConversionFormat}
 */
export function getTextEntryConversionFormat(questionType) {
  if (!takesAnswers(questionType)) {
    return {};
  }
  return { answers: { key: AnswerKey.ACCEPTED, level: ContentLevel.PLAIN } };
}

/**
 * @param {import('./parse').TextEntryState} state
 * @param {string} questionType
 * @returns {import('../../conversion').ConvertibleContent}
 */
export function exportTextEntryContent(state, questionType) {
  return {
    prompt: state.prompt,
    answers: {
      key: AnswerKey.ACCEPTED,
      level: ContentLevel.PLAIN,
      // A free response saves no answers, so it has none to carry, whatever its state holds.
      items: takesAnswers(questionType)
        ? state.answers.map(({ value, caseSensitive }) => ({
            content: value,
            correct: true,
            caseSensitive,
          }))
        : [],
      expectedLength: state.expectedLength,
    },
  };
}

/**
 * @param {import('../../conversion').ConvertibleContent} content
 * @param {string} questionType
 * @returns {import('./parse').TextEntryState}
 */
export function importTextEntryContent({ prompt, answers }, questionType) {
  const state = _defaultState();
  const items = answers?.items ?? [];
  return {
    ...state,
    prompt,
    answers: items.length
      ? items.map(({ content, caseSensitive }) => ({
          id: generateRandomSlug('answer'),
          value: content,
          // Numeric answers are never case-sensitive.
          caseSensitive: questionType === QuestionType.TEXT_ENTRY && Boolean(caseSensitive),
        }))
      : state.answers,
    expectedLength: answers?.expectedLength ?? state.expectedLength,
  };
}
