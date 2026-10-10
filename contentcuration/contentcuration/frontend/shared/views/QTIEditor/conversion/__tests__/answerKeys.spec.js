import { AnswerKey, ContentLevel, ConversionLoss } from '../../constants';
import { carryAnswers } from '../answerKeys';

const { SELECTED, ACCEPTED, ORDERED } = AnswerKey;
const { RICH, PLAIN } = ContentLevel;
const {
  ANSWERS_REMOVED,
  INCORRECT_ANSWERS_REMOVED,
  CORRECT_ANSWERS_REDUCED,
  CORRECT_ANSWERS_NOT_KEPT,
  ORDER_BECOMES_ANSWER,
  ORDER_NOT_KEPT,
  FORMATTING_REMOVED,
} = ConversionLoss;

const item = (content, correct = false) => ({ content, correct });
const list = (key, items, level = RICH) => ({ key, level, items });
const format = (key, extra = {}) => ({ key, level: RICH, ...extra });

const summary = items => items.map(({ content, correct }) => [content, correct]);

describe('carryAnswers', () => {
  describe('from selected answers', () => {
    const answers = list(SELECTED, [
      item('<p>A</p>', true),
      item('<p>B</p>'),
      item('<p>C</p>', true),
    ]);

    it('keeps every answer and its mark for another selected type', () => {
      const result = carryAnswers(answers, format(SELECTED));
      expect(summary(result.answers.items)).toEqual([
        ['<p>A</p>', true],
        ['<p>B</p>', false],
        ['<p>C</p>', true],
      ]);
      expect(result.losses).toEqual([]);
    });

    it('keeps only the correct answers as accepted ones, and says the others go', () => {
      const result = carryAnswers(answers, format(ACCEPTED));
      expect(summary(result.answers.items)).toEqual([
        ['<p>A</p>', true],
        ['<p>C</p>', true],
      ]);
      expect(result.losses).toEqual([INCORRECT_ANSWERS_REMOVED]);
    });

    it('removes a blank wrong answer without counting it as a loss', () => {
      const withBlank = list(SELECTED, [item('<p>A</p>', true), item('<p></p>')]);
      expect(carryAnswers(withBlank, format(ACCEPTED)).losses).toEqual([]);
    });

    it('keeps every answer for ordering, saying the marks go and the order becomes the key', () => {
      const result = carryAnswers(answers, format(ORDERED));
      expect(summary(result.answers.items)).toEqual([
        ['<p>A</p>', false],
        ['<p>B</p>', false],
        ['<p>C</p>', false],
      ]);
      expect(result.losses).toEqual([CORRECT_ANSWERS_NOT_KEPT, ORDER_BECOMES_ANSWER]);
    });

    it('says nothing about marks for ordering when none was marked', () => {
      const unmarked = list(SELECTED, [item('<p>A</p>'), item('<p>B</p>')]);
      expect(carryAnswers(unmarked, format(ORDERED)).losses).toEqual([ORDER_BECOMES_ANSWER]);
    });

    it('says nothing about the order for ordering with only one answer', () => {
      const single = list(SELECTED, [item('<p>A</p>'), item('<p></p>')]);
      expect(carryAnswers(single, format(ORDERED)).losses).toEqual([]);
    });
  });

  describe('from accepted answers', () => {
    const answers = list(ACCEPTED, [item('Paris', true), item('paris', true)], PLAIN);

    it('marks every answer correct for a selected type', () => {
      const result = carryAnswers(answers, format(SELECTED));
      expect(summary(result.answers.items)).toEqual([
        ['<p>Paris</p>', true],
        ['<p>paris</p>', true],
      ]);
      expect(result.losses).toEqual([]);
    });

    it('keeps every answer for another accepted type', () => {
      const result = carryAnswers(answers, { key: ACCEPTED, level: PLAIN });
      expect(summary(result.answers.items)).toEqual([
        ['Paris', true],
        ['paris', true],
      ]);
      expect(result.losses).toEqual([]);
    });

    it('keeps every answer for ordering, saying the order becomes the key', () => {
      const result = carryAnswers(answers, format(ORDERED));
      expect(result.answers.items).toHaveLength(2);
      expect(result.losses).toEqual([ORDER_BECOMES_ANSWER]);
    });
  });

  describe('from ordered answers', () => {
    const answers = list(ORDERED, [item('<p>1</p>'), item('<p>2</p>')]);

    it('keeps every answer, unmarked, for a selected type, saying the order goes', () => {
      const result = carryAnswers(answers, format(SELECTED));
      expect(summary(result.answers.items)).toEqual([
        ['<p>1</p>', false],
        ['<p>2</p>', false],
      ]);
      expect(result.losses).toEqual([ORDER_NOT_KEPT]);
    });

    it('removes every answer for an accepted type, since none was accepted', () => {
      const result = carryAnswers(answers, { key: ACCEPTED, level: PLAIN });
      expect(result.answers.items).toEqual([]);
      expect(result.losses).toEqual([ANSWERS_REMOVED]);
    });

    it('keeps every answer for another ordered type', () => {
      expect(carryAnswers(answers, format(ORDERED)).losses).toEqual([]);
    });
  });

  describe('into single choice', () => {
    it('keeps the first correct answer marked, saying the others lose their mark', () => {
      const answers = list(SELECTED, [
        item('<p>A</p>'),
        item('<p>B</p>', true),
        item('<p>C</p>', true),
      ]);
      const result = carryAnswers(answers, format(SELECTED, { single: true }));
      expect(summary(result.answers.items)).toEqual([
        ['<p>A</p>', false],
        ['<p>B</p>', true],
        ['<p>C</p>', false],
      ]);
      expect(result.losses).toEqual([CORRECT_ANSWERS_REDUCED]);
    });

    it('keeps the mark on an answer with content over a blank one marked first', () => {
      const answers = list(SELECTED, [item('<p></p>', true), item('<p>B</p>', true)]);
      const result = carryAnswers(answers, format(SELECTED, { single: true }));
      expect(summary(result.answers.items)).toEqual([
        ['<p></p>', false],
        ['<p>B</p>', true],
      ]);
      expect(result.losses).toEqual([]);
    });

    it('says nothing when only one answer was correct', () => {
      const answers = list(SELECTED, [item('<p>A</p>', true), item('<p>B</p>')]);
      expect(carryAnswers(answers, format(SELECTED, { single: true })).losses).toEqual([]);
    });

    it('marks none when none was correct', () => {
      const answers = list(SELECTED, [item('<p>A</p>'), item('<p>B</p>')]);
      const result = carryAnswers(answers, format(SELECTED, { single: true }));
      expect(result.answers.items.every(({ correct }) => !correct)).toBe(true);
    });

    it('keeps only the first of several accepted answers marked', () => {
      const answers = list(ACCEPTED, [item('Paris', true), item('paris', true)], PLAIN);
      const result = carryAnswers(answers, format(SELECTED, { single: true }));
      expect(summary(result.answers.items)).toEqual([
        ['<p>Paris</p>', true],
        ['<p>paris</p>', false],
      ]);
      expect(result.losses).toEqual([CORRECT_ANSWERS_REDUCED]);
    });
  });

  describe('content levels', () => {
    it('reads rich answers as plain text, saying formatting goes', () => {
      const answers = list(SELECTED, [item('<p><b>Paris</b></p>', true)]);
      const result = carryAnswers(answers, { key: ACCEPTED, level: PLAIN });
      expect(summary(result.answers.items)).toEqual([['Paris', true]]);
      expect(result.losses).toEqual([FORMATTING_REMOVED]);
    });

    it('removes an answer that was only an image', () => {
      const answers = list(SELECTED, [
        item('<p><img src="a.png"/></p>', true),
        item('<p>B</p>', true),
      ]);
      const result = carryAnswers(answers, { key: ACCEPTED, level: PLAIN });
      expect(summary(result.answers.items)).toEqual([['B', true]]);
      expect(result.losses).toEqual([FORMATTING_REMOVED]);
    });

    it('keeps plain text from a single paragraph without a loss', () => {
      const answers = list(SELECTED, [item('<p>Paris</p>', true)]);
      expect(carryAnswers(answers, { key: ACCEPTED, level: PLAIN }).losses).toEqual([]);
    });
  });

  it('carries the answers that travel with each one, and the shuffle setting', () => {
    const answers = {
      ...list(ACCEPTED, [{ content: 'H2O', correct: true, caseSensitive: true }], PLAIN),
      shuffle: true,
    };
    const result = carryAnswers(answers, { key: ACCEPTED, level: PLAIN });
    expect(result.answers).toEqual({
      key: ACCEPTED,
      level: PLAIN,
      items: [{ content: 'H2O', correct: true, caseSensitive: true }],
      shuffle: true,
    });
  });
});
