import { CorrectCriterion, ContentLevel, QuestionType } from '../../constants';
import { changedSettings } from '../../conversion/settings';
import { _defaultState, newChoice } from './parse';

function settingsOf(questionType) {
  const { shuffle, showAnswerCount } = _defaultState();
  // Single choice shows no answer count: a learner always picks one.
  return questionType === QuestionType.MULTI_SELECT ? { shuffle, showAnswerCount } : { shuffle };
}

/**
 * @param {string} questionType
 * @returns {import('../../conversion').ConversionFormat}
 */
export function getChoiceConversionFormat(questionType) {
  return {
    answers: {
      correctCriterion: CorrectCriterion.SELECTED,
      contentLevel: ContentLevel.RICH,
      single: questionType === QuestionType.SINGLE_SELECT,
    },
    settings: settingsOf(questionType),
  };
}

/**
 * @param {import('./parse').ChoiceState} state
 * @param {string} questionType
 * @returns {import('../../conversion').ConvertibleContent}
 */
export function exportChoiceContent(state, questionType) {
  return {
    prompt: state.prompt,
    answers: {
      correctCriterion: CorrectCriterion.SELECTED,
      contentLevel: ContentLevel.RICH,
      items: state.choices.map(({ content, correct, fixed }) => ({
        content,
        correct,
        fixed: Boolean(fixed),
      })),
      orientation: state.orientation,
    },
    settings: changedSettings(state, settingsOf(questionType)),
  };
}

/**
 * @param {import('../../conversion').ConvertibleContent} content
 * @returns {import('./parse').ChoiceState}
 */
export function importChoiceContent({ prompt, answers, settings }) {
  const state = _defaultState();
  const items = answers?.items ?? [];
  return {
    ...state,
    prompt,
    choices: items.length
      ? items.map(({ content, correct, fixed }) =>
          newChoice({ content, correct, fixed: Boolean(fixed) }),
        )
      : state.choices,
    shuffle: settings?.shuffle ?? state.shuffle,
    showAnswerCount: settings?.showAnswerCount ?? state.showAnswerCount,
    orientation: answers?.orientation ?? state.orientation,
  };
}
