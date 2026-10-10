import { ContentLevel } from '../../constants';
import { generateRandomSlug } from '../../utils/generateRandomSlug';
import { BLANK_ATTR, parsePassageHTML } from '../../conversion/passage';
import { CORRECT_ATTR, DROPDOWN, OPTION, _defaultState, readDropdown } from './parse';

/**
 * Converting an inline choice question to and from other question types (see
 * conversion/). Its passage carries over to another passage type, and is folded
 * into the question for any other type.
 */

/**
 * @returns {import('../../conversion').ConversionFormat}
 */
export function getInlineChoiceConversionFormat() {
  return { passage: { level: ContentLevel.PLAIN } };
}

/**
 * Each dropdown becomes a blank, its correct option the blank's answer and the rest its own
 * options.
 *
 * @param {import('./parse').InlineChoiceState} state
 * @returns {import('../../conversion').ConvertibleContent}
 */
export function exportInlineChoiceContent(state) {
  const body = parsePassageHTML(state.passage);
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
      html: body.innerHTML,
      blanks,
      distractors: [],
      level: ContentLevel.PLAIN,
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
  const dropdown = doc.createElement(DROPDOWN);
  dropdown.setAttribute('response-identifier', generateRandomSlug('response'));
  for (const text of texts.length ? texts : ['']) {
    const option = doc.createElement(OPTION);
    option.setAttribute('identifier', generateRandomSlug('choice'));
    option.textContent = text;
    dropdown.appendChild(option);
  }
  // The answer leads the list, so it is the first option.
  if (answer?.trim()) {
    dropdown.setAttribute(CORRECT_ATTR, dropdown.firstChild.getAttribute('identifier'));
  }
  return dropdown;
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
  const body = parsePassageHTML(passage.html);
  const answers = passage.blanks.map(({ answer }) => answer).filter(Boolean);
  for (const placeholder of body.querySelectorAll(`[${BLANK_ATTR}]`)) {
    const blank = passage.blanks[Number(placeholder.getAttribute(BLANK_ATTR))];
    placeholder.replaceWith(
      blank ? buildDropdown(body.ownerDocument, blank, answers, passage.distractors) : '',
    );
  }
  return { prompt, passage: body.innerHTML, shuffle: passage.shuffle ?? state.shuffle };
}
