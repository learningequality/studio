import { computed, readonly } from 'vue';
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
  const base = useInteraction(choiceInteractionDescriptor, interactionBlock, questionType);
  const { state } = base;
  const isSingleSelect = computed(() => questionType.value === QuestionType.SINGLE_SELECT);

  function addChoice() {
    state.value = {
      ...state.value,
      choices: [
        ...state.value.choices,
        { id: generateRandomSlug('choice'), content: '', correct: false },
      ],
    };
  }

  function removeChoice(id) {
    if (state.value.choices.length <= 1) return;
    state.value = {
      ...state.value,
      choices: state.value.choices.filter(a => a.id !== id),
    };
  }

  function moveChoiceUp(id) {
    const choices = [...state.value.choices];
    const idx = choices.findIndex(a => a.id === id);
    if (idx <= 0) return;
    [choices[idx - 1], choices[idx]] = [choices[idx], choices[idx - 1]];
    state.value = { ...state.value, choices };
  }

  function moveChoiceDown(id) {
    const choices = [...state.value.choices];
    const idx = choices.findIndex(a => a.id === id);
    if (idx === -1 || idx >= choices.length - 1) return;
    [choices[idx], choices[idx + 1]] = [choices[idx + 1], choices[idx]];
    state.value = { ...state.value, choices };
  }

  /** Apply a permutation of the current choice ids; anything else is ignored. */
  function setChoiceOrder(orderedIds) {
    const byId = new Map(state.value.choices.map(c => [c.id, c]));
    const choices = [...new Set(orderedIds)].map(id => byId.get(id));
    if (choices.length !== byId.size || choices.includes(undefined)) return;
    state.value = { ...state.value, choices };
  }

  /**
   * Toggle the correct flag for a single choice.
   *
   * singleSelect: clears all others and sets only the target to correct.
   * multiSelect:  toggles only the target choice's correct field.
   */
  function toggleCorrectChoice(id) {
    state.value = {
      ...state.value,
      choices: state.value.choices.map(a => {
        if (questionType.value === QuestionType.SINGLE_SELECT) {
          return { ...a, correct: a.id === id };
        }
        return a.id === id ? { ...a, correct: !a.correct } : a;
      }),
    };
  }

  function setPrompt(html) {
    state.value = { ...state.value, prompt: html };
  }

  function setChoiceContent(id, html) {
    state.value = {
      ...state.value,
      choices: state.value.choices.map(a => (a.id === id ? { ...a, content: html } : a)),
    };
  }

  function setShuffle(val) {
    state.value = { ...state.value, shuffle: val };
  }

  function setShowAnswerCount(val) {
    state.value = { ...state.value, showAnswerCount: val };
  }

  return {
    ...base,
    state: readonly(state),
    isSingleSelect,
    addChoice,
    removeChoice,
    moveChoiceUp,
    moveChoiceDown,
    setChoiceOrder,
    toggleCorrectChoice,
    setPrompt,
    setChoiceContent,
    setShuffle,
    setShowAnswerCount,
  };
}
