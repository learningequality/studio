import flatMap from 'lodash/flatMap';
import { ContentLevel } from '../../constants';
import { getContentHTML, parseHTMLBody } from '../../serialization/xml';
import { BLANK_ATTR } from '../../conversion/passage';
import { GAP, _defaultState, newDistractor, readGap, writeGap } from './parse';
import {
  hasRichTextContent,
  richTextComparisonKey,
} from 'shared/views/TipTapEditor/TipTapEditor/utils/comparisonKey';

/**
 * @returns {import('../../conversion').ConversionFormat}
 */
export function getGapMatchConversionFormat() {
  // Learners always see the pool shuffled, so another type's shuffle is kept.
  return { passage: { contentLevel: ContentLevel.INLINE }, settings: { shuffle: true } };
}

/**
 * Each gap becomes a blank, its content the blank's answer. A gap has no options of its own:
 * every wrong answer is in the shared pool of distractors.
 *
 * @param {import('./parse').GapMatchState} state
 * @returns {import('../../conversion').ConvertibleContent}
 */
export function exportGapMatchContent(state) {
  const body = parseHTMLBody(state.passage);
  const blanks = [...body.querySelectorAll(GAP)].map((el, index) => {
    const { answer } = readGap(el);
    const placeholder = body.ownerDocument.createElement('span');
    placeholder.setAttribute(BLANK_ATTR, String(index));
    el.replaceWith(placeholder);
    return { answer: hasRichTextContent(answer) ? answer : null, options: [] };
  });
  return {
    prompt: state.prompt,
    passage: {
      html: getContentHTML(body),
      blanks,
      distractors: state.distractors.map(({ content }) => content),
      contentLevel: ContentLevel.INLINE,
    },
  };
}

/**
 * Each blank becomes a gap holding its answer. Every blank's own options join the shared
 * pool, which is what a gap match learner chooses from. The conversion repeats an option
 * offered in several dropdowns, or one that is another blank's answer, so those repeats are
 * dropped rather than left for validation to flag.
 *
 * @param {import('../../conversion').ConvertibleContent} content
 * @returns {import('./parse').GapMatchState}
 */
export function importGapMatchContent({ prompt, passage }) {
  const state = _defaultState();
  if (!passage) {
    return { ...state, prompt };
  }
  const body = parseHTMLBody(passage.html);
  for (const placeholder of body.querySelectorAll(`[${BLANK_ATTR}]`)) {
    const blank = passage.blanks[Number(placeholder.getAttribute(BLANK_ATTR))];
    if (!blank) {
      placeholder.remove();
      continue;
    }
    placeholder.replaceWith(writeGap(body.ownerDocument, blank.answer ?? ''));
  }

  const offered = new Set(
    passage.blanks.map(({ answer }) => richTextComparisonKey(answer)).filter(Boolean),
  );
  const distractors = [];
  for (const content of [
    ...flatMap(passage.blanks, ({ options }) => options),
    ...passage.distractors,
  ]) {
    const key = richTextComparisonKey(content);
    if (key && !offered.has(key)) {
      offered.add(key);
      distractors.push(newDistractor(content));
    }
  }

  return { ...state, prompt, passage: getContentHTML(body), distractors };
}
