import { reactive, readonly, watch } from 'vue';
import { QuestionType } from '../constants';
import { formatLocaleNumber, keepStoredNumber, readLocaleNumber } from '../utils/localeNumbers';
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

  state.value = {
    ...state.value,
    answers: state.value.answers.map(a => ({
      ...a,
      value: isNumeric() ? formatLocaleNumber(a.value, options.language) : a.value,
      stored: a.value,
    })),
  };

  function replaceAnswers(show, id) {
    const answers = state.value.answers.map(a =>
      id === undefined || a.id === id ? { ...a, ...show(a) } : a,
    );
    // Unchanged state would still rebuild and emit the XML, saving an answer nobody edited.
    if (answers.every((a, i) => a.value === state.value.answers[i].value)) return;
    state.value = { ...state.value, answers };
  }

  // An answer the old language rejects may be what the author meant in the new one.
  // The shown text may read as another form of its number (French `1,50` as `1.5`), so the
  // number it shows is recorded as stored.
  function showStored({ value, stored }, from) {
    const read = readLocaleNumber(value, from) ?? readLocaleNumber(value, options.language);
    if (read === null) return { value };
    const kept = keepStoredNumber(read, stored);
    return { value: formatLocaleNumber(kept, options.language), stored: kept };
  }

  watch(
    questionType,
    (type, oldType) => {
      if (type === QuestionType.NUMERIC) {
        showStoredAnswerValue();
      } else if (oldType === QuestionType.NUMERIC) {
        // A learner can't type the U+2212 minus a formatted number may carry.
        replaceAnswers(({ value }) => ({
          value:
            readLocaleNumber(value, options.language) === null ? value : value.replace(/−/g, '-'),
        }));
      }
    },
    { flush: 'sync' },
  );

  watch(
    () => options.language,
    (_, oldLanguage) => {
      if (isNumeric()) replaceAnswers(answer => showStored(answer, oldLanguage));
    },
    { flush: 'sync' },
  );

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
      // A typed answer is stored as typed, so its stored form no longer applies.
      answers: state.value.answers.map(a => (a.id === id ? { ...a, value, stored: undefined } : a)),
    };
  }

  /**
   * Show a numeric answer, or all of them, as the value it is stored as. Other answers are
   * stored as typed.
   *
   * @param {string} [id]
   */
  function showStoredAnswerValue(id) {
    if (isNumeric()) replaceAnswers(answer => showStored(answer, options.language), id);
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
