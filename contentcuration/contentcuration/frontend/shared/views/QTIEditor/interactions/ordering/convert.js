import { AnswerKey, ContentLevel } from '../../constants';
import { generateRandomSlug } from '../../utils/generateRandomSlug';
import { _defaultState } from './parse';

/**
 * Converting an ordering question to and from other question types (see
 * conversion/).
 *
 * Ordering's shuffle is neither given nor taken: authors can't change it, and an ordering
 * question that isn't shuffled shows its items in the correct order.
 */

/**
 * @returns {import('../../conversion').ConversionFormat}
 */
export function getOrderingConversionFormat() {
  return { answers: { key: AnswerKey.ORDERED, level: ContentLevel.RICH } };
}

/**
 * @param {import('./parse').OrderingState} state
 * @returns {import('../../conversion').ConvertibleContent}
 */
export function exportOrderingContent(state) {
  return {
    prompt: state.prompt,
    answers: {
      key: AnswerKey.ORDERED,
      level: ContentLevel.RICH,
      items: state.items.map(({ content, fixed }) => ({
        content,
        correct: false,
        fixed: Boolean(fixed),
      })),
      orientation: state.orientation,
    },
  };
}

/**
 * @param {import('../../conversion').ConvertibleContent} content
 * @returns {import('./parse').OrderingState}
 */
export function importOrderingContent({ prompt, answers }) {
  const state = _defaultState();
  const items = answers?.items ?? [];
  return {
    ...state,
    prompt,
    items: items.length
      ? items.map(({ content, fixed }) => ({
          id: generateRandomSlug('order'),
          content,
          fixed: Boolean(fixed),
        }))
      : state.items,
    orientation: answers?.orientation ?? state.orientation,
  };
}
