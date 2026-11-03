import { _defaultState, newChoice } from './parse';

/**
 * @returns {import('../../conversion').ConversionFormat}
 */
export function getAssociateConversionFormat() {
  // Learners always see the choices shuffled, so another type's shuffle is kept.
  return { pairs: true, settings: { shuffle: true } };
}

/**
 * @param {import('./parse').AssociateState} state
 * @returns {import('../../conversion').ConvertibleContent}
 */
export function exportAssociateContent(state) {
  return {
    prompt: state.prompt,
    pairs: {
      items: state.pairs.map(([source, target]) => ({
        source: source.content,
        target: target.content,
      })),
      distractors: state.distractors.map(({ content }) => content),
    },
  };
}

/**
 * @param {import('../../conversion').ConvertibleContent} content
 * @returns {import('./parse').AssociateState}
 */
export function importAssociateContent({ prompt, pairs }) {
  const state = _defaultState();
  const items = pairs?.items ?? [];
  return {
    ...state,
    prompt,
    pairs: items.length
      ? items.map(({ source, target }) => [newChoice(source), newChoice(target)])
      : state.pairs,
    distractors: (pairs?.distractors ?? []).map(content => newChoice(content)),
  };
}
