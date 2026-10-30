import uniqBy from 'lodash/uniqBy';
import { CorrectCriterion, ContentLevel, QuestionType } from '../../constants';
import { changedSettings } from '../../conversion/settings';
import { formatLocaleNumber, readLocaleNumber } from '../../utils/localeNumbers';
import { parseXsdDouble } from '../../utils/math';
import { _defaultState, newAnswer } from './parse';

// A free response has no answers to give or take.
const takesAnswers = questionType => questionType !== QuestionType.FREE_RESPONSE;

// Case only matters to an answer with letters that have it: "H2O", not "1,5".
const matchesCase = ({ value, caseSensitive }) =>
  caseSensitive && value.toLowerCase() !== value.toUpperCase();

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
    settings:
      questionType === QuestionType.TEXT_ENTRY ? { caseSensitive: newAnswer().caseSensitive } : {},
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
    settings: changedSettings(
      { caseSensitive: state.answers.some(matchesCase) },
      getTextEntryConversionFormat(questionType).settings ?? {},
    ),
  };
}

/**
 * @param {import('../../conversion').ConvertibleContent} content
 * @param {string} questionType
 * @param {{ language?: string }} [options] - The exercise language
 * @returns {import('./parse').TextEntryState}
 */
export function importTextEntryContent({ prompt, answers }, questionType, { language } = {}) {
  // Answers arrive as the author saw them; numeric ones are stored as typing them into the
  // numeric field would store them, read in the exercise language. Those that aren't numbers
  // stay as written, for validation to point out.
  const stored = content =>
    questionType === QuestionType.NUMERIC
      ? (readLocaleNumber(content, language) ?? content)
      : content;
  const state = _defaultState();
  const items = (answers?.items ?? []).map(({ content, caseSensitive }) =>
    newAnswer({
      value: stored(content),
      // Numeric answers are never case-sensitive.
      caseSensitive: questionType === QuestionType.TEXT_ENTRY && Boolean(caseSensitive),
    }),
  );
  // Text entry `2` and `2.0` store the same number, which is one numeric answer.
  const kept =
    questionType === QuestionType.NUMERIC
      ? uniqBy(items, ({ value }) => parseXsdDouble(value) ?? value)
      : items;
  return {
    ...state,
    prompt,
    answers: kept.length ? kept : state.answers,
    expectedLength: answers?.expectedLength ?? state.expectedLength,
  };
}
