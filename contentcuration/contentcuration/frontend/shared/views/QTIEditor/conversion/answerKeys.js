import { AnswerKey, ConversionLoss } from '../constants';
import { changeLevel, hasContent } from './content';

/**
 * @typedef {object} AnswerList - The `answers` facet: a question's answers as a list
 * @property {string} key - AnswerKey: what makes an answer correct
 * @property {string} level - ContentLevel the answers are at
 * @property {Array<{ content: string, correct: boolean, caseSensitive?: boolean,
 *   fixed?: boolean }>} items - In authored order. `fixed` keeps an answer in place when the
 *   answers are shuffled.
 * @property {boolean} [shuffle] - Only from a type whose author can change it
 * @property {string} [orientation] - How the answers are laid out, for a type that has it
 * @property {number} [expectedLength] - The size of the answer field, for a type that has it
 */

/**
 * @typedef {object} AnswerFormat - The answers a question type takes
 * @property {string} key - AnswerKey
 * @property {string} level - ContentLevel
 * @property {boolean} [single] - At most one answer can be marked correct
 */

const { SELECTED, ACCEPTED, ORDERED } = AnswerKey;
const {
  ANSWERS_REMOVED,
  INCORRECT_ANSWERS_REMOVED,
  CORRECT_ANSWERS_REDUCED,
  CORRECT_ANSWERS_NOT_KEPT,
  ORDER_BECOMES_ANSWER,
  ORDER_NOT_KEPT,
  FORMATTING_REMOVED,
} = ConversionLoss;

const markAll = correct => items => items.map(item => ({ ...item, correct }));
const keep = items => items;

/**
 * How each kind of answer key becomes each other kind: `RULES[from][to]` takes the items,
 * the ones among them with content, and the list to report losses in.
 *
 * Nothing is ever marked correct that the author didn't mark, except where every answer
 * already was (accepted answers). What validation can't catch is reported: a wrong answer
 * that would become an accepted one is removed, and an order that becomes the answer key,
 * or stops being it, is pointed out.
 */
const RULES = {
  [SELECTED]: {
    [SELECTED]: keep,
    [ACCEPTED]: (items, filled, losses) => {
      if (filled.some(item => !item.correct)) losses.push(INCORRECT_ANSWERS_REMOVED);
      return items.filter(item => item.correct);
    },
    [ORDERED]: (items, filled, losses) => {
      if (filled.some(item => item.correct)) losses.push(CORRECT_ANSWERS_NOT_KEPT);
      if (filled.length > 1) losses.push(ORDER_BECOMES_ANSWER);
      return markAll(false)(items);
    },
  },
  [ACCEPTED]: {
    [SELECTED]: markAll(true),
    [ACCEPTED]: keep,
    [ORDERED]: (items, filled, losses) => {
      if (filled.length > 1) losses.push(ORDER_BECOMES_ANSWER);
      return markAll(false)(items);
    },
  },
  [ORDERED]: {
    [SELECTED]: (items, filled, losses) => {
      if (filled.length > 1) losses.push(ORDER_NOT_KEPT);
      return markAll(false)(items);
    },
    // No item is an accepted answer, and making them all accepted would invent an answer key.
    [ACCEPTED]: (items, filled, losses) => {
      if (filled.length) losses.push(ANSWERS_REMOVED);
      return [];
    },
    [ORDERED]: keep,
  },
};

/**
 * Single choice shows its correct answer as a radio button, which can't show several. The
 * first correct answer with content keeps its mark; the others stay as answers, unmarked.
 */
function keepOneCorrect(items, counts, losses) {
  const correct = items.filter(item => item.correct);
  if (correct.filter(counts).length > 1) losses.push(CORRECT_ANSWERS_REDUCED);
  const kept = correct.find(counts) ?? correct[0];
  return items.map(item => ({ ...item, correct: item === kept }));
}

function relevel(items, from, to, losses) {
  let lost = false;
  const moved = items.flatMap(item => {
    const { content, lost: itemLost } = changeLevel(item.content, from, to);
    lost = lost || itemLost;
    // An answer that was only an image or a formula has nothing left to show.
    const emptied = hasContent(item.content, from) && !hasContent(content, to);
    return emptied ? [] : [{ ...item, content }];
  });
  if (lost) losses.push(FORMATTING_REMOVED);
  return moved;
}

/**
 * Carry a question's answers into the format another question type takes.
 *
 * @param {AnswerList} answers
 * @param {AnswerFormat} format
 * @returns {{ answers: AnswerList, losses: string[] }} `losses` are ConversionLoss codes
 */
export function carryAnswers(answers, format) {
  const losses = [];
  const counts = item => hasContent(item.content, answers.level);
  const filled = answers.items.filter(counts);

  let items = RULES[answers.key][format.key](answers.items, filled, losses);
  if (format.single) {
    items = keepOneCorrect(items, counts, losses);
  }
  items = relevel(items, answers.level, format.level, losses);

  return {
    // The list's settings travel as they are; each type takes the ones it has.
    answers: { ...answers, key: format.key, level: format.level, items },
    losses,
  };
}

/**
 * Whether any answer says anything, so removing them all is a loss.
 *
 * @param {AnswerList} answers
 * @returns {boolean}
 */
export function answersHaveContent(answers) {
  return answers.items.some(item => hasContent(item.content, answers.level));
}
