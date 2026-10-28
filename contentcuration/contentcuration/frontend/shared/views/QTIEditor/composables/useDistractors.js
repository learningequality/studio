import { newChoice } from '../interactions/associate/parse';

/**
 * The distractor edits of an interaction whose state holds a `distractors` list.
 *
 * @param {import('vue').Ref<{ distractors: Array<{ id: string, content: string }> }>} state
 */
export function useDistractors(state) {
  function addDistractor(content = '') {
    state.value = {
      ...state.value,
      distractors: [...state.value.distractors, newChoice(content)],
    };
  }

  function removeDistractor(index) {
    state.value = {
      ...state.value,
      distractors: state.value.distractors.filter((_, i) => i !== index),
    };
  }

  function setDistractorContent(index, html) {
    state.value = {
      ...state.value,
      distractors: state.value.distractors.map((choice, i) =>
        i === index ? { ...choice, content: html } : choice,
      ),
    };
  }

  return { addDistractor, removeDistractor, setDistractorContent };
}
