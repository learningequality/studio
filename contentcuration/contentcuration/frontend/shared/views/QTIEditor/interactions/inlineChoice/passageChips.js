import { inject, provide } from 'vue';
import { qtiEditorStrings } from '../../qtiEditorStrings';

const PassageChipsSymbol = Symbol('inlineChoicePassageChips');

export function providePassageChips(chips) {
  provide(PassageChipsSymbol, chips);
}

export function injectPassageChips() {
  return inject(PassageChipsSymbol);
}

/**
 * What a chip shows and is called, shared by the chip and by what the passage announces about
 * it, so a screen reader hears a chip named the same way wherever it meets it.
 *
 * @param {{ options: Array<{ id: string, text: string }>, correctId: string|null }} attrs - The
 *   chip node's attributes
 * @param {object} [state]
 * @param {boolean} [state.hasErrors] - Whether the dropdown has validation errors
 * @param {boolean} [state.isConcealed] - Whether a preview hides the answers
 * @returns {{ label: string, optionCount: number, hasAnswer: boolean, accessibleName: string }}
 */
export function describeChip(
  { options, correctId },
  { hasErrors = false, isConcealed = false } = {},
) {
  const {
    addAnswers$,
    answerDropdownWithCorrect$,
    answerDropdownNoCorrect$,
    answerDropdownWithCorrectNeedsAttention$,
    answerDropdownNoCorrectNeedsAttention$,
    answerDropdownHidden$,
    answerDropdownHiddenNeedsAttention$,
    chooseAnswer$,
  } = qtiEditorStrings;

  const optionCount = options.filter(option => option.text.trim()).length;
  const correct = options.find(option => option.id === correctId);
  const correctText = correct ? correct.text.trim() : '';
  const hasAnswer = correctText !== '';

  if (isConcealed) {
    // A preview that hides the answers must not read them out either, but still says which
    // dropdowns need work, as their colour does.
    const label = chooseAnswer$();
    const name = hasErrors ? answerDropdownHiddenNeedsAttention$ : answerDropdownHidden$;
    return { label, optionCount, hasAnswer, accessibleName: name({ label, count: optionCount }) };
  }

  const label = hasAnswer ? correctText : addAnswers$();
  // Starts with the visible label, so voice control finds the chip by what it shows.
  let name;
  if (hasAnswer) {
    name = hasErrors ? answerDropdownWithCorrectNeedsAttention$ : answerDropdownWithCorrect$;
  } else {
    name = hasErrors ? answerDropdownNoCorrectNeedsAttention$ : answerDropdownNoCorrect$;
  }
  return { label, optionCount, hasAnswer, accessibleName: name({ label, count: optionCount }) };
}
