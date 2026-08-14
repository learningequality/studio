import { readonly } from 'vue';
import { generateRandomSlug } from '../utils/generateRandomSlug';
import { textEntryInteractionDescriptor } from '../interactions/textEntry/Descriptor';
import { useInteraction } from './useInteraction';

/**
 * Composable for the text entry interaction editor.
 *
 * Extends useInteraction with mutation methods needed by TextEntryEditor.vue.
 * There is no moveAnswerUp/Down — answer order is not meaningful for either
 * numeric acceptable-answer lists or textEntry correct-answer lists.
 *
 * @param {{ bodyXml: string, responseDeclarations: string[] }} interactionBlock
 * @param {import('vue').Ref<string|null>} questionType
 */
export function useTextEntryInteraction(interactionBlock, questionType) {
  const base = useInteraction(textEntryInteractionDescriptor, interactionBlock, questionType);
  const { state } = base;

  function setPrompt(html) {
    state.value = { ...state.value, prompt: html };
  }

  // Answer list mutations

  function addAnswer() {
    const newId = generateRandomSlug('answer');
    state.value = {
      ...state.value,
      answers: [...state.value.answers, { id: newId, value: '', caseSensitive: false }],
    };
    return newId;
  }

  /**
   * Remove an answer by id. No-op when only one answer remains so authors
   * always have at least one row to fill in for numeric/textEntry questions.
   *
   * @param {string} id
   */
  function removeAnswer(id) {
    if (state.value.answers.length <= 1) return;
    state.value = {
      ...state.value,
      answers: state.value.answers.filter(a => a.id !== id),
    };
  }

  /**
   * Update the answer value for a row.
   * For numeric, this must be a valid float/int string.
   * For textEntry, this is any non-blank string.
   *
   * @param {string} id
   * @param {string} value
   */
  function updateAnswerValue(id, value) {
    state.value = {
      ...state.value,
      answers: state.value.answers.map(a => (a.id === id ? { ...a, value } : a)),
    };
  }

  /**
   * Toggle the caseSensitive flag for a textEntry answer row.
   *
   * @param {string} id
   */
  function toggleCaseSensitive(id) {
    state.value = {
      ...state.value,
      answers: state.value.answers.map(a =>
        a.id === id ? { ...a, caseSensitive: !a.caseSensitive } : a,
      ),
    };
  }

  return {
    ...base,
    state: readonly(state),
    setPrompt,
    addAnswer,
    removeAnswer,
    updateAnswerValue,
    toggleCaseSensitive,
  };
}
