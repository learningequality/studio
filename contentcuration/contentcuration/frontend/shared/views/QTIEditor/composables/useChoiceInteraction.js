import { readonly } from 'vue';
import { QuestionType } from '../constants';
import { generateRandomSlug } from '../utils/generateRandomSlug';
import { choiceInteractionDescriptor } from '../interactions/choice/ChoiceInteractionDescriptor';
import { useInteraction } from './useInteraction';

/**
 * Composable for the choice interaction editor.
 *
 * Extends useInteraction with all mutation methods needed by ChoiceEditor.vue.
 * State mutations always produce a new array reference so Vue's computed
 * dependencies invalidate correctly.
 *
 * @param {{ bodyXml: string, responseDeclarations: string[] }} interactionBlock
 * @param {import('vue').Ref<string|null>} questionType
 */
export function useChoiceInteraction(interactionBlock, questionType) {
  // Use the import-safe descriptor core — it owns parse/buildXML/validate schema
  // without depending on choice/index.js or ChoiceInteractionEditor.vue.
  const base = useInteraction(choiceInteractionDescriptor, interactionBlock, questionType);
  const { state } = base;

  // ---------------------------------------------------------------------------
  // Structural mutations
  // ---------------------------------------------------------------------------

  function addChoice() {
    state.value = {
      ...state.value,
      answers: [
        ...state.value.answers,
        { id: generateRandomSlug('choice'), content: '', correct: false, fixed: false },
      ],
    };
  }

  function removeChoice(id) {
    if (state.value.answers.length <= 1) return;
    state.value = {
      ...state.value,
      answers: state.value.answers.filter(a => a.id !== id),
    };
  }

  function moveChoiceUp(id) {
    const answers = [...state.value.answers];
    const idx = answers.findIndex(a => a.id === id);
    if (idx <= 0) return;
    [answers[idx - 1], answers[idx]] = [answers[idx], answers[idx - 1]];
    state.value = { ...state.value, answers };
  }

  function moveChoiceDown(id) {
    const answers = [...state.value.answers];
    const idx = answers.findIndex(a => a.id === id);
    if (idx === -1 || idx >= answers.length - 1) return;
    [answers[idx], answers[idx + 1]] = [answers[idx + 1], answers[idx]];
    state.value = { ...state.value, answers };
  }

  /**
   * Toggle the correct flag for a single choice.
   *
   * singleSelect: clears all others and sets only the target to correct.
   * multiSelect:  toggles only the target answer's correct field.
   */
  function toggleCorrectChoice(id) {
    state.value = {
      ...state.value,
      answers: state.value.answers.map(a => {
        if (questionType.value === QuestionType.SINGLE_SELECT) {
          return { ...a, correct: a.id === id };
        }
        return a.id === id ? { ...a, correct: !a.correct } : a;
      }),
    };
  }

  // ---------------------------------------------------------------------------
  // Field mutations
  // ---------------------------------------------------------------------------

  function setPrompt(html) {
    state.value = { ...state.value, prompt: html };
  }

  function setChoiceContent(id, html) {
    state.value = {
      ...state.value,
      answers: state.value.answers.map(a => (a.id === id ? { ...a, content: html } : a)),
    };
  }

  function setShuffle(val) {
    state.value = { ...state.value, shuffle: val };
  }

  function setOrientation(val) {
    state.value = { ...state.value, orientation: val };
  }

  function setMaxChoices(n) {
    state.value = { ...state.value, maxChoices: n };
  }

  return {
    ...base,
    state: readonly(state),
    addChoice,
    removeChoice,
    moveChoiceUp,
    moveChoiceDown,
    toggleCorrectChoice,
    setPrompt,
    setChoiceContent,
    setShuffle,
    setOrientation,
    setMaxChoices,
  };
}
