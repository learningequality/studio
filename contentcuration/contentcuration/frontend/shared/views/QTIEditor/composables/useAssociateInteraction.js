import { readonly } from 'vue';
import { associateInteractionDescriptor } from '../interactions/associate/Descriptor';
import { newChoice } from '../interactions/associate/parse';
import { useDistractors } from './useDistractors';
import { useInteraction } from './useInteraction';

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
    state.value = { ...state.value, pairs: [...state.value.pairs, [newChoice(), newChoice()]] };
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

  function setPrompt(html) {
    state.value = { ...state.value, prompt: html };
  }

  return {
    ...base,
    state: readonly(state),
    addPair,
    removePair,
    setPair,
    ...useDistractors(state),
    setPrompt,
  };
}
