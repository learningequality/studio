import { inject, provide } from 'vue';
import { qtiEditorStrings } from '../../qtiEditorStrings';
import { ValidationError } from '../../constants';
import { MIN_OPTIONS, dropdownErrors } from './validation';

const PassageChipsSymbol = Symbol('inlineChoicePassageChips');

export function providePassageChips(chips) {
  provide(PassageChipsSymbol, chips);
}

export function injectPassageChips() {
  return inject(PassageChipsSymbol);
}

const problemMessages = {
  [ValidationError.NO_CORRECT_ANSWER]: () => qtiEditorStrings.errorNoCorrectAnswer$(),
  [ValidationError.TOO_FEW_CHOICES]: () =>
    qtiEditorStrings.errorTooFewInlineChoiceOptions$({ count: MIN_OPTIONS }),
};

/**
 * What a dropdown as a whole lacks, as its options panel lists it; its chip shows the first.
 *
 * @param {{ options: Array, correctId: string|null }} dropdown
 * @returns {string[]}
 */
export function dropdownProblems(dropdown) {
  return dropdownErrors(dropdown).map(code => problemMessages[code]());
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
    answerDropdownWithCorrect$,
    answerDropdownNoCorrect$,
    answerDropdownWithCorrectNeedsAttention$,
    answerDropdownNoCorrectNeedsAttention$,
    answerDropdownHidden$,
    answerDropdownHiddenNeedsAttention$,
    chooseAnswer$,
    errorEmptyChoiceContent$,
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

  // A chip shows its answer while it has one, its error icon saying whether it needs work.
  // Without one, it says what its options panel says is missing.
  const [problem] = dropdownProblems({ options, correctId });
  let label = correctText;
  if (!hasAnswer) label = problem ?? errorEmptyChoiceContent$();
  // Starts with the visible label, so voice control finds the chip by what it shows.
  let name;
  if (hasAnswer) {
    name = hasErrors ? answerDropdownWithCorrectNeedsAttention$ : answerDropdownWithCorrect$;
  } else {
    name = hasErrors ? answerDropdownNoCorrectNeedsAttention$ : answerDropdownNoCorrect$;
  }
  return { label, optionCount, hasAnswer, accessibleName: name({ label, count: optionCount }) };
}
