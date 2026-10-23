import { computed, readonly } from 'vue';
import { inlineChoiceInteractionDescriptor } from '../interactions/inlineChoice/Descriptor';
import { getDropdowns } from '../interactions/inlineChoice/parse';
import { hasRichTextContent } from '../utils/richText';
import { useInteraction } from './useInteraction';

/**
 * Composable for the inline choice interaction editor.
 *
 * Extends useInteraction with the question-level mutations. A dropdown's options are not
 * edited here: they live in the passage, and are changed through the passage editor's node
 * commands so that each edit is one step of its history.
 *
 * @param {{ bodyXml: string, responseDeclarations: string[] }} interactionBlock
 * @param {import('vue').Ref<string|null>} questionType
 */
export function useInlineChoiceInteraction(interactionBlock, questionType) {
  const base = useInteraction(inlineChoiceInteractionDescriptor, interactionBlock, questionType);
  const { state } = base;

  /** Every dropdown in the passage, in document order. */
  const dropdowns = computed(() => getDropdowns(state.value.passage));

  // A cleared question is no question, rather than an empty paragraph saved into the body.
  function setPrompt(html) {
    state.value = { ...state.value, prompt: hasRichTextContent(html) ? html : '' };
  }

  function setPassage(html) {
    state.value = { ...state.value, passage: html };
  }

  function setShuffle(val) {
    state.value = { ...state.value, shuffle: val };
  }

  return {
    ...base,
    state: readonly(state),
    dropdowns,
    setPrompt,
    setPassage,
    setShuffle,
  };
}
