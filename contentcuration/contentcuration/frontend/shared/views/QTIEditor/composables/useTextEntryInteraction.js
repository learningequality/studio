import { computed, readonly, watch } from 'vue';
import { QuestionType, ValidationError } from '../constants';
import { parseXsdDouble } from '../utils/math';
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
 * @param {{ language?: string }} [options] - The language numeric answers are written in
 */
export function useTextEntryInteraction(interactionBlock, questionType, options = {}) {
  const base = useInteraction(textEntryInteractionDescriptor, interactionBlock, questionType, {
    ...options,
    // An unedited answer goes back as stored, so opening it in a language that reads it
    // differently (German `1,2`) doesn't rewrite it.
    storedValue: id => (uneditedIds.has(id) ? storedById.get(id).stored : undefined),
  });
  const { state } = base;

  // Stored numeric answers are shown formatted in the exercise language. Leaving Numeric puts
  // the ones still shown that way back as stored, and returning formats them again; answers
  // the author typed stay as typed.
  const storedAnswers = textEntryInteractionDescriptor.parse(
    interactionBlock.bodyXml,
    interactionBlock.responseDeclarations,
  ).answers;
  const storedById = new Map(
    state.value.answers.map((a, i) => [a.id, { shown: a.value, stored: storedAnswers[i].value }]),
  );
  function swapStoredAnswers(from, to) {
    state.value = {
      ...state.value,
      answers: state.value.answers.map(a =>
        storedById.get(a.id)?.[from] === a.value ? { ...a, value: storedById.get(a.id)[to] } : a,
      ),
    };
  }
  watch(
    questionType,
    (newType, oldType) => {
      if (oldType === QuestionType.NUMERIC && newType !== QuestionType.NUMERIC) {
        swapStoredAnswers('shown', 'stored');
      } else if (oldType !== QuestionType.NUMERIC && newType === QuestionType.NUMERIC) {
        swapStoredAnswers('stored', 'shown');
      }
    },
    { flush: 'sync' },
  );

  // Publishing validates the stored XML, so a stored answer that isn't xsd:double stays
  // invalid until the author edits it, even when the exercise language reads it.
  const uneditedIds = new Set(state.value.answers.map(a => a.id));
  const errors = computed(() => {
    if (questionType.value !== QuestionType.NUMERIC) return base.errors.value;
    const storedErrors = state.value.answers
      .filter(
        a =>
          uneditedIds.has(a.id) &&
          parseXsdDouble(storedById.get(a.id).stored.trim()) === null &&
          !base.errors.value.some(
            e => e.code === ValidationError.INVALID_NUMERIC_VALUE && e.id === a.id,
          ),
      )
      .map(a => ({ code: ValidationError.INVALID_NUMERIC_VALUE, id: a.id }));
    return [...base.errors.value, ...storedErrors];
  });

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
    uneditedIds.delete(id);
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
    errors,
    setPrompt,
    addAnswer,
    removeAnswer,
    updateAnswerValue,
    toggleCaseSensitive,
  };
}
