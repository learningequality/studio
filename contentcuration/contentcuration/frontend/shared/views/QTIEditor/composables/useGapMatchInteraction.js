import { computed, readonly } from 'vue';
import { gapMatchInteractionDescriptor } from '../interactions/gapMatch/Descriptor';
import { getGaps } from '../interactions/gapMatch/parse';
import { useDistractors } from './useDistractors';
import { useInteraction } from './useInteraction';
import { hasRichTextContent } from 'shared/views/TipTapEditor/TipTapEditor/utils/comparisonKey';

/**
 * Composable for the gap match interaction editor.
 *
 * Extends useInteraction with the question-level mutations. A gap's answer is not edited here:
 * it lives in the passage, and is typed in the passage editor.
 *
 * @param {{ bodyXml: string, responseDeclarations: string[] }} interactionBlock
 * @param {import('vue').Ref<string|null>} questionType
 */
export function useGapMatchInteraction(interactionBlock, questionType) {
  const base = useInteraction(gapMatchInteractionDescriptor, interactionBlock, questionType);
  const { state } = base;

  /** Every gap in the passage, in document order. */
  const gaps = computed(() => getGaps(state.value.passage));

  function setPrompt(html) {
    state.value = { ...state.value, prompt: hasRichTextContent(html) ? html : '' };
  }

  function setPassage(html) {
    state.value = { ...state.value, passage: html };
  }

  return {
    ...base,
    state: readonly(state),
    gaps,
    setPrompt,
    setPassage,
    ...useDistractors(state),
  };
}
