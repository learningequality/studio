import { inject, provide, ref } from 'vue';
import { findChildren } from '@tiptap/core';
import { qtiEditorStrings } from '../../qtiEditorStrings';

const PassageGapsSymbol = Symbol('gapMatchPassageGaps');

const speakLatex = ref(null);
let mathLive = null;

function loadSpeech() {
  if (mathLive) return;
  mathLive = import(/* webpackChunkName: "mathlive" */ 'mathlive')
    .then(module => {
      speakLatex.value = module.convertLatexToSpeakableText;
    })
    .catch(() => {
      mathLive = null;
    });
}

function formulaText(latex) {
  if (speakLatex.value) return speakLatex.value(latex);
  loadSpeech();
  return latex;
}

const holdsFormula = gap => findChildren(gap, node => Boolean(node.attrs.latex)).length > 0;

export function loadFormulaSpeech(gaps) {
  if (!speakLatex.value && gaps.some(holdsFormula)) loadSpeech();
}

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
 * A gap's answer as plain text. A formula has no text of its own, so it reads as MathLive
 * speaks it, as the formula's own field does. Until MathLive loads, it reads as its LaTeX, which
 * is what the formula's field shows until then. Reactive: it changes when MathLive loads.
 *
 * @param {import('@tiptap/pm/model').Node} node - The gap node
 * @returns {string}
 */
export function gapAnswerText(node) {
  return node.textBetween(0, node.content.size, ' ', leaf =>
    leaf.attrs.latex ? formulaText(leaf.attrs.latex) : '',
  );
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
