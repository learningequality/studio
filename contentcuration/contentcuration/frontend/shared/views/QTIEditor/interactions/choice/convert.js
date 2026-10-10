import { AnswerKey, ContentLevel, QuestionType } from '../../constants';
import { generateRandomSlug } from '../../utils/generateRandomSlug';
import { _defaultState } from './parse';

/**
 * Converting a choice question to and from other question types (see conversion/).
 */

/**
 * @param {string} questionType
 * @returns {import('../../conversion').ConversionFormat}
 */
export function getChoiceConversionFormat(questionType) {
  return {
    answers: {
      key: AnswerKey.SELECTED,
      level: ContentLevel.RICH,
      single: questionType === QuestionType.SINGLE_SELECT,
    },
  };
}

/**
 * @param {import('./parse').ChoiceState} state
 * @returns {import('../../conversion').ConvertibleContent}
 */
export function exportChoiceContent(state) {
  return {
    prompt: state.prompt,
    answers: {
      key: AnswerKey.SELECTED,
      level: ContentLevel.RICH,
      items: state.choices.map(({ content, correct, fixed }) => ({
        content,
        correct,
        fixed: Boolean(fixed),
      })),
      shuffle: state.shuffle,
      orientation: state.orientation,
    },
  };
}

/**
 * @param {import('../../conversion').ConvertibleContent} content
 * @returns {import('./parse').ChoiceState}
 */
export function importChoiceContent({ prompt, answers }) {
  const state = _defaultState();
  const items = answers?.items ?? [];
  return {
    ...state,
    prompt,
    choices: items.length
      ? items.map(({ content, correct, fixed }) => ({
          id: generateRandomSlug('choice'),
          content,
          correct,
          fixed: Boolean(fixed),
        }))
      : state.choices,
    shuffle: answers?.shuffle ?? state.shuffle,
    orientation: answers?.orientation ?? state.orientation,
  };
}
