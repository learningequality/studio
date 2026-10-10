import { reactive, readonly, watch } from 'vue';
import { QuestionType } from '../constants';
import { formatLocaleNumber, readLocaleNumber } from '../utils/localeNumbers';
import { textEntryInteractionDescriptor } from '../interactions/textEntry/Descriptor';
import { newAnswer } from '../interactions/textEntry/parse';
import { useInteraction } from './useInteraction';

/**
 * Composable for the text entry interaction editor.
 *
 * Extends useInteraction with mutation methods needed by TextEntryEditor.vue.
 * There is no moveAnswerUp/Down — answer order is not meaningful for either
 * numeric acceptable-answer lists or textEntry correct-answer lists.
 *
 * Numeric answers are shown as the value they are stored as, written in `language`: on
 * opening, on switching to Numeric, on a language change, and when the author leaves an answer.
 *
 * @param {{ bodyXml: string, responseDeclarations: string[] }} interactionBlock
 * @param {import('vue').Ref<string|null>} questionType
 * @param {{ language?: import('vue').Ref<string>|string }} [options] - The language numeric
 *   answers are written in
 */
export function useTextEntryInteraction(interactionBlock, questionType, { language } = {}) {
  const options = reactive({ language });
  const base = useInteraction(
    textEntryInteractionDescriptor,
    interactionBlock,
    questionType,
    options,
  );
  const { state } = base;

  // Only Numeric answers are reformatted; others are stored as typed.
  const isNumeric = () => questionType.value === QuestionType.NUMERIC;

  if (isNumeric()) replaceAnswers(value => formatLocaleNumber(value, options.language));

  function replaceAnswers(show, id) {
    const answers = state.value.answers.map(a =>
      id === undefined || a.id === id ? { ...a, value: show(a.value) } : a,
    );
    // Unchanged state would still rebuild and emit the XML, saving an answer nobody edited.
    if (answers.every((a, i) => a.value === state.value.answers[i].value)) return;
    state.value = { ...state.value, answers };
  }

  // An answer the old language rejects may be what the author meant in the new one.
  function showStored(value, from) {
    const read = readLocaleNumber(value, from) ?? readLocaleNumber(value, options.language);
    return read === null ? value : formatLocaleNumber(read, options.language);
  }

  watch(
    questionType,
    (type, oldType) => {
      if (type === QuestionType.NUMERIC) {
        // Read as xsd:double first: leaving Numeric stores 1.5 as `1.5`, which German reads as 15.
        replaceAnswers(value => showStored(value));
      } else if (oldType === QuestionType.NUMERIC) {
        // Keeps the value stored, not the language's display of it, which learners may not type.
        replaceAnswers(value => readLocaleNumber(value, options.language) ?? value);
      }
    },
    { flush: 'sync' },
  );

  watch(
    () => options.language,
    (_, oldLanguage) => {
      if (isNumeric()) replaceAnswers(value => showStored(value, oldLanguage));
    },
    { flush: 'sync' },
  );

  function setPrompt(html) {
    state.value = { ...state.value, prompt: html };
  }

  // Answer list mutations

  function addAnswer() {
    const answer = newAnswer();
    state.value = { ...state.value, answers: [...state.value.answers, answer] };
    return answer.id;
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
   * Show a numeric answer, or all of them, as the value it is stored as. Other answers are
   * stored as typed.
   *
   * @param {string} [id]
   */
  function showStoredAnswerValue(id) {
    if (isNumeric()) replaceAnswers(value => showStored(value, options.language), id);
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
    showStoredAnswerValue,
    toggleCaseSensitive,
  };
}
