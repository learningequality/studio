import { readonly } from 'vue';
import { matchInteractionDescriptor } from '../interactions/match/Descriptor';
import { newChoice, newRow } from '../interactions/match/parse';
import { useInteraction } from './useInteraction';

/**
 * Composable for the match interaction editor.
 *
 * @param {{ bodyXml: string, responseDeclarations: string[] }} interactionBlock
 * @param {import('vue').Ref<string|null>} questionType
 */
export function useMatchInteraction(interactionBlock, questionType) {
  const base = useInteraction(matchInteractionDescriptor, interactionBlock, questionType);
  const { state } = base;

  function updateRow(index, update) {
    state.value = {
      ...state.value,
      rows: state.value.rows.map((row, i) => (i === index ? update(row) : row)),
    };
  }

  function addRow() {
    state.value = { ...state.value, rows: [...state.value.rows, newRow()] };
  }

  function removeRow(index) {
    // A match question is meaningless without a row to match.
    if (state.value.rows.length <= 1) return;
    state.value = {
      ...state.value,
      rows: state.value.rows.filter((_, i) => i !== index),
    };
  }

  function setRowContent(index, html) {
    updateRow(index, row => ({ ...row, content: html }));
  }

  function addMatch(rowIndex, content = '') {
    updateRow(rowIndex, row => ({ ...row, matches: [...row.matches, newChoice(content)] }));
  }

  function removeMatch(rowIndex, index) {
    // A row always keeps an answer to match.
    if (state.value.rows[rowIndex].matches.length <= 1) return;
    updateRow(rowIndex, row => ({
      ...row,
      matches: row.matches.filter((_, i) => i !== index),
    }));
  }

  function setMatchContent(rowIndex, index, html) {
    updateRow(rowIndex, row => ({
      ...row,
      matches: row.matches.map((choice, i) =>
        i === index ? { ...choice, content: html } : choice,
      ),
    }));
  }

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

  function setPrompt(html) {
    state.value = { ...state.value, prompt: html };
  }

  return {
    ...base,
    state: readonly(state),
    addRow,
    removeRow,
    setRowContent,
    addMatch,
    removeMatch,
    setMatchContent,
    addDistractor,
    removeDistractor,
    setDistractorContent,
    setPrompt,
  };
}
