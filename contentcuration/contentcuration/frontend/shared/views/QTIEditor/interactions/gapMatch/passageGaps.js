import { inject, provide } from 'vue';
import { qtiEditorStrings } from '../../qtiEditorStrings';

const PassageGapsSymbol = Symbol('gapMatchPassageGaps');

/**
 * @typedef  {object} PassageGaps
 * @property {Readonly<import('vue').Ref<string[]>>} gapIds - The gap identifiers in the
 *   passage, in document order
 * @property {Readonly<import('vue').Ref<boolean>>} isEditable - Whether the passage is edited
 * @property {Readonly<import('vue').Ref<string[]>>} errorGapIds - The identifiers of the gaps
 *   with validation errors
 * @property {Readonly<import('vue').Ref<boolean>>} showAnswers - Whether a read-only passage
 *   shows each gap's answer
 */

/** @param {PassageGaps} gaps */
export function providePassageGaps(gaps) {
  provide(PassageGapsSymbol, gaps);
}

/** @returns {PassageGaps} */
export function injectPassageGaps() {
  return inject(PassageGapsSymbol);
}

/**
 * What a gap is called, by the gap and by what the passage announces about it.
 *
 * @param {object} gap
 * @param {string} gap.answer - The gap's answer as plain text
 * @param {number} gap.number - The gap's position in the passage, from 1
 * @param {boolean} [gap.isConcealed] - Whether a preview hides the answers
 * @returns {string}
 */
export function describeGap({ answer, number, isConcealed = false }) {
  const { gapWithAnswer$, gapEmpty$, gapHidden$ } = qtiEditorStrings;
  if (isConcealed) return gapHidden$({ number });
  const text = answer.trim();
  return text ? gapWithAnswer$({ answer: text, number }) : gapEmpty$({ number });
}
