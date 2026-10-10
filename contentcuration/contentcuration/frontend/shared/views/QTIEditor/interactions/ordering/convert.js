import { CorrectCriterion, ContentLevel } from '../../constants';
import { _defaultState, newItem } from './parse';

/**
 * Ordering's shuffle is neither given nor taken: authors can't change it, and an ordering
 * question that isn't shuffled shows its items in the correct order.
 */

/**
 * @returns {import('../../conversion').ConversionFormat}
 */
export function getOrderingConversionFormat() {
  return {
    answers: { correctCriterion: CorrectCriterion.ORDERED, contentLevel: ContentLevel.RICH },
  };
}

/**
 * @param {import('./parse').OrderingState} state
 * @returns {import('../../conversion').ConvertibleContent}
 */
export function exportOrderingContent(state) {
  return {
    prompt: state.prompt,
    answers: {
      correctCriterion: CorrectCriterion.ORDERED,
      contentLevel: ContentLevel.RICH,
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
      ? items.map(({ content, fixed }) => newItem({ content, fixed: Boolean(fixed) }))
      : state.items,
    orientation: answers?.orientation ?? state.orientation,
  };
}
