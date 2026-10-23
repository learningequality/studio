import { CorrectCriterion, ContentLevel, QuestionType } from '../../constants';
import { formatLocaleNumber } from '../../utils/localeNumbers';
import { _defaultState, newAnswer } from './parse';

// A free response has no answers to give or take.
const takesAnswers = questionType => questionType !== QuestionType.FREE_RESPONSE;

/**
 * @param {string} questionType
 * @returns {import('../../conversion').ConversionFormat}
 */
export function getTextEntryConversionFormat(questionType) {
  if (!takesAnswers(questionType)) {
    return {};
  }
  return {
    answers: { correctCriterion: CorrectCriterion.ACCEPTED, contentLevel: ContentLevel.PLAIN },
  };
}

/**
 * @param {import('./parse').TextEntryState} state
 * @param {string} questionType
 * @param {{ language?: string }} [options] - The exercise language
 * @returns {import('../../conversion').ConvertibleContent}
 */
export function exportTextEntryContent(state, questionType, { language } = {}) {
  // Numeric answers are stored as xsd:double but shown in the exercise language; they leave as
  // the author saw them, which is also how learners of that language write them.
  const shown = value =>
    questionType === QuestionType.NUMERIC ? formatLocaleNumber(value, language) : value;
  return {
    prompt: state.prompt,
    answers: {
      correctCriterion: CorrectCriterion.ACCEPTED,
      contentLevel: ContentLevel.PLAIN,
      // A free response saves no answers, so it has none to carry, whatever its state holds.
      items: takesAnswers(questionType)
        ? state.answers.map(({ value, caseSensitive }) => ({
            content: shown(value),
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
      ? items.map(({ content, caseSensitive }) =>
          newAnswer({
            value: content,
            // Numeric answers are never case-sensitive.
            caseSensitive: questionType === QuestionType.TEXT_ENTRY && Boolean(caseSensitive),
          }),
        )
      : state.answers,
    expectedLength: answers?.expectedLength ?? state.expectedLength,
  };
}
