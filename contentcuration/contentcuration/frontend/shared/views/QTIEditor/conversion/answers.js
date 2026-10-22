import flatMap from 'lodash/flatMap';
import { CorrectCriterion, ConversionLoss } from '../constants';
import { changeContentLevel, hasContent } from './content';

/**
 * @typedef {object} AnswerList - The `answers` facet: a question's answers as a list
 * @property {string} correctCriterion - CorrectCriterion: what makes an answer correct
 * @property {string} contentLevel - ContentLevel: how much markup the answers hold
 * @property {Array<{ content: string, correct: boolean, caseSensitive?: boolean,
 *   fixed?: boolean }>} items - In authored order. `fixed` keeps an answer in place when the
 *   answers are shuffled.
 * @property {string} [orientation] - How the answers are laid out, for a type that has it
 * @property {number} [expectedLength] - The size of the answer field, for a type that has it
 */

/**
 * @typedef {object} AnswerFormat - The answers a question type takes
 * @property {string} correctCriterion - CorrectCriterion
 * @property {string} contentLevel - ContentLevel: how much markup the type's answers can hold
 * @property {boolean} [single] - At most one answer can be marked correct
 */

const markAll = correct => items => items.map(item => ({ ...item, correct }));
const keep = items => items;

/**
 * How each correct criterion becomes each other one: `RULES[from][to]` takes the items,
 * the ones among them that keep content in the new type, and the list to report losses in.
 *
 * Nothing is ever marked correct that the author didn't mark, except where every answer
 * already was (accepted answers). What validation can't catch is reported: a wrong answer
 * that would become an accepted one is removed, and correct answers that become enough on
 * their own, or an order that becomes what is correct or stops being it, are pointed out.
 */
const RULES = {
  [CorrectCriterion.SELECTED]: {
    [CorrectCriterion.SELECTED]: keep,
    [CorrectCriterion.ACCEPTED]: (items, filled, losses) => {
      if (filled.some(item => !item.correct)) losses.push(ConversionLoss.INCORRECT_ANSWERS_REMOVED);
      // Every correct choice had to be selected; any one accepted answer is enough.
      if (filled.filter(item => item.correct).length > 1) {
        losses.push(ConversionLoss.ANY_CORRECT_ANSWER_ACCEPTED);
      }
      return items.filter(item => item.correct);
    },
    [CorrectCriterion.ORDERED]: (items, filled, losses) => {
      if (filled.some(item => item.correct)) losses.push(ConversionLoss.CORRECT_ANSWERS_NOT_KEPT);
      if (filled.length > 1) losses.push(ConversionLoss.ORDER_BECOMES_ANSWER);
      return markAll(false)(items);
    },
  },
  [CorrectCriterion.ACCEPTED]: {
    // Every accepted answer was correct, so every choice is. Single choice can only keep one
    // marked; carryAnswers applies that after these rules (keepOneCorrect), which is where
    // the loss for the other correct answers is reported.
    [CorrectCriterion.SELECTED]: markAll(true),
    [CorrectCriterion.ACCEPTED]: keep,
    [CorrectCriterion.ORDERED]: (items, filled, losses) => {
      if (filled.length > 1) losses.push(ConversionLoss.ORDER_BECOMES_ANSWER);
      return markAll(false)(items);
    },
  },
  [CorrectCriterion.ORDERED]: {
    [CorrectCriterion.SELECTED]: (items, filled, losses) => {
      if (filled.length > 1) losses.push(ConversionLoss.ORDER_NOT_KEPT);
      return markAll(false)(items);
    },
    // No item is an accepted answer, and making them all accepted would invent correct answers.
    [CorrectCriterion.ACCEPTED]: (items, filled, losses) => {
      if (filled.length) losses.push(ConversionLoss.ANSWERS_REMOVED);
      return [];
    },
    [CorrectCriterion.ORDERED]: keep,
  },
};

/**
 * Single choice shows its correct answer as a radio button, which can't show several. The
 * first correct answer with content keeps its mark; the others stay as answers, unmarked.
 */
function keepOneCorrect(items, counts, losses) {
  const correct = items.filter(item => item.correct);
  if (correct.filter(counts).length > 1) losses.push(ConversionLoss.CORRECT_ANSWERS_REDUCED);
  const kept = correct.find(counts) ?? correct[0];
  return items.map(item => ({ ...item, correct: item === kept }));
}

function changeContentLevels(items, from, to, losses) {
  let lost = false;
  const moved = flatMap(items, item => {
    const { content, lost: itemLost } = changeContentLevel(item.content, from, to);
    lost = lost || itemLost;
    // An answer that was only an image or a formula has nothing left to show.
    const emptied = hasContent(item.content, from) && !hasContent(content, to);
    return emptied ? [] : [{ ...item, content }];
  });
  if (lost) losses.push(ConversionLoss.FORMATTING_REMOVED);
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
  // An answer that was only an image has nothing left as plain text, so it is removed rather
  // than carried as a correct or wrong one.
  const counts = item =>
    hasContent(
      changeContentLevel(item.content, answers.contentLevel, format.contentLevel).content,
      format.contentLevel,
    );
  const filled = answers.items.filter(counts);

  let items = RULES[answers.correctCriterion][format.correctCriterion](
    answers.items,
    filled,
    losses,
  );
  if (format.single) {
    items = keepOneCorrect(items, counts, losses);
  }
  items = changeContentLevels(items, answers.contentLevel, format.contentLevel, losses);

  return {
    // The list's settings travel as they are; each type takes the ones it has.
    answers: {
      ...answers,
      correctCriterion: format.correctCriterion,
      contentLevel: format.contentLevel,
      items,
    },
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
  return answers.items.some(item => hasContent(item.content, answers.contentLevel));
}
