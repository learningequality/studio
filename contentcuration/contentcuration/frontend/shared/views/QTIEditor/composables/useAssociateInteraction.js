import { readonly } from 'vue';
import { generateRandomSlug } from '../utils/generateRandomSlug';
import { associateInteractionDescriptor } from '../interactions/associate/AssociateInteractionDescriptor';
import { useInteraction } from './useInteraction';

const blankChoice = () => ({ id: generateRandomSlug('choice'), content: '' });

/**
 * Composable for the associate interaction editor.
 *
 * @param {{ bodyXml: string, responseDeclarations: string[] }} interactionBlock
 * @param {import('vue').Ref<string|null>} questionType
 */
export function useAssociateInteraction(interactionBlock, questionType) {
  const base = useInteraction(associateInteractionDescriptor, interactionBlock, questionType);
  const { state } = base;

  function addPair() {
    state.value = { ...state.value, pairs: [...state.value.pairs, [blankChoice(), blankChoice()]] };
  }

  function removePair(index) {
    // An associate question is meaningless without a pair to associate.
    if (state.value.pairs.length <= 1) return;
    state.value = {
      ...state.value,
      pairs: state.value.pairs.filter((_, i) => i !== index),
    };
  }

  function setPair(index, newPair) {
    state.value = {
      ...state.value,
      pairs: state.value.pairs.map((pair, i) => (i === index ? newPair : pair)),
    };
  }

  function addDistractor(content = '') {
    state.value = {
      ...state.value,
      distractors: [...state.value.distractors, { ...blankChoice(), content }],
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

  function setPrompt(html) {
    state.value = { ...state.value, prompt: html };
  }

  return {
    ...base,
    state: readonly(state),
    addPair,
    removePair,
    setPair,
    addDistractor,
    removeDistractor,
    setDistractorContent,
    setPrompt,
  };
}
