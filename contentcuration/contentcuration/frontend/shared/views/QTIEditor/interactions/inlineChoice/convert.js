import { ContentLevel } from '../../constants';
import { getContentHTML, parseHTMLBody } from '../../serialization/xml';
import { BLANK_ATTR } from '../../conversion/passage';
import {
  DROPDOWN,
  _defaultState,
  newDropdown,
  newOption,
  readDropdown,
  writeDropdown,
} from './parse';

/**
 * @returns {import('../../conversion').ConversionFormat}
 */
export function getInlineChoiceConversionFormat() {
  return { passage: { contentLevel: ContentLevel.PLAIN } };
}

/**
 * Each dropdown becomes a blank, its correct option the blank's answer and the rest its own
 * options.
 *
 * @param {import('./parse').InlineChoiceState} state
 * @returns {import('../../conversion').ConvertibleContent}
 */
export function exportInlineChoiceContent(state) {
  const body = parseHTMLBody(state.passage);
  const blanks = [...body.querySelectorAll(DROPDOWN)].map((el, index) => {
    const { options, correctId } = readDropdown(el);
    const placeholder = body.ownerDocument.createElement('span');
    placeholder.setAttribute(BLANK_ATTR, String(index));
    el.replaceWith(placeholder);

    const correct = options.find(option => option.id === correctId);
    return {
      answer: correct ? correct.text : null,
      options: options.filter(option => option !== correct).map(option => option.text),
    };
  });
  return {
    prompt: state.prompt,
    passage: {
      html: getContentHTML(body),
      blanks,
      distractors: [],
      contentLevel: ContentLevel.PLAIN,
      shuffle: state.shuffle,
    },
  };
}

/**
 * A dropdown offering everything a learner could have put in its blank: its answer, its own
 * options, every other blank's answer and every distractor, as a gap match learner chooses
 * from one shared pool. Its answer, when it has one, is its correct option. One with nothing
 * to offer starts as an unfilled dropdown, with one empty option.
 */
function buildDropdown(doc, { answer, options }, answers, distractors) {
  const texts = [
    ...new Set(
      [answer, ...options, ...answers, ...distractors].map(text => text?.trim()).filter(Boolean),
    ),
  ];
  const dropdownOptions = (texts.length ? texts : ['']).map(text => newOption(text));
  return writeDropdown(
    doc,
    newDropdown({
      options: dropdownOptions,
      // The answer leads the list, so it is the first option.
      correctId: answer?.trim() ? dropdownOptions[0].id : null,
    }),
  );
}

/**
 * @param {import('../../conversion').ConvertibleContent} content
 * @returns {import('./parse').InlineChoiceState}
 */
export function importInlineChoiceContent({ prompt, passage }) {
  const state = _defaultState();
  if (!passage) {
    return { ...state, prompt };
  }
  const body = parseHTMLBody(passage.html);
  const answers = passage.blanks.map(({ answer }) => answer).filter(Boolean);
  for (const placeholder of body.querySelectorAll(`[${BLANK_ATTR}]`)) {
    const blank = passage.blanks[Number(placeholder.getAttribute(BLANK_ATTR))];
    placeholder.replaceWith(
      blank ? buildDropdown(body.ownerDocument, blank, answers, passage.distractors) : '',
    );
  }
  return { prompt, passage: getContentHTML(body), shuffle: passage.shuffle ?? state.shuffle };
}
