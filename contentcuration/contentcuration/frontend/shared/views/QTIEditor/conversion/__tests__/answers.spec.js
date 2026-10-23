import { CorrectCriterion, ContentLevel, ConversionLoss } from '../../constants';
import { carryAnswers } from '../answers';

const item = (content, correct = false) => ({ content, correct });
const list = (correctCriterion, items, contentLevel = ContentLevel.RICH) => ({
  correctCriterion,
  contentLevel,
  items,
});
const format = (correctCriterion, extra = {}) => ({
  correctCriterion,
  contentLevel: ContentLevel.RICH,
  ...extra,
});

const summary = items => items.map(({ content, correct }) => [content, correct]);

describe('carryAnswers', () => {
  describe('from selected answers', () => {
    const answers = list(CorrectCriterion.SELECTED, [
      item('<p>A</p>', true),
      item('<p>B</p>'),
      item('<p>C</p>', true),
    ]);

    it('keeps every answer and its mark for another selected type', () => {
      const result = carryAnswers(answers, format(CorrectCriterion.SELECTED));
      expect(summary(result.answers.items)).toEqual([
        ['<p>A</p>', true],
        ['<p>B</p>', false],
        ['<p>C</p>', true],
      ]);
      expect(result.losses).toEqual([]);
    });

    it('keeps only the correct answers as accepted ones, and says the others go', () => {
      const result = carryAnswers(answers, format(CorrectCriterion.ACCEPTED));
      expect(summary(result.answers.items)).toEqual([
        ['<p>A</p>', true],
        ['<p>C</p>', true],
      ]);
      expect(result.losses).toEqual([
        ConversionLoss.INCORRECT_ANSWERS_REMOVED,
        ConversionLoss.ANY_CORRECT_ANSWER_ACCEPTED,
      ]);
    });

    it('says nothing of accepting any one answer when only one was correct', () => {
      const oneCorrect = list(CorrectCriterion.SELECTED, [
        item('<p>A</p>', true),
        item('<p>B</p>'),
      ]);
      expect(carryAnswers(oneCorrect, format(CorrectCriterion.ACCEPTED)).losses).toEqual([
        ConversionLoss.INCORRECT_ANSWERS_REMOVED,
      ]);
    });

    it('does not count a blank correct answer towards accepting any one answer', () => {
      const withBlank = list(CorrectCriterion.SELECTED, [
        item('<p>A</p>', true),
        item('<p></p>', true),
      ]);
      expect(carryAnswers(withBlank, format(CorrectCriterion.ACCEPTED)).losses).toEqual([]);
    });

    it('removes a blank wrong answer without counting it as a loss', () => {
      const withBlank = list(CorrectCriterion.SELECTED, [item('<p>A</p>', true), item('<p></p>')]);
      expect(carryAnswers(withBlank, format(CorrectCriterion.ACCEPTED)).losses).toEqual([]);
    });

    it('keeps every answer for ordering, saying the marks go and the order becomes the correct answer', () => {
      const result = carryAnswers(answers, format(CorrectCriterion.ORDERED));
      expect(summary(result.answers.items)).toEqual([
        ['<p>A</p>', false],
        ['<p>B</p>', false],
        ['<p>C</p>', false],
      ]);
      expect(result.losses).toEqual([
        ConversionLoss.CORRECT_ANSWERS_NOT_KEPT,
        ConversionLoss.ORDER_BECOMES_ANSWER,
      ]);
    });

    it('says nothing about marks for ordering when none was marked', () => {
      const unmarked = list(CorrectCriterion.SELECTED, [item('<p>A</p>'), item('<p>B</p>')]);
      expect(carryAnswers(unmarked, format(CorrectCriterion.ORDERED)).losses).toEqual([
        ConversionLoss.ORDER_BECOMES_ANSWER,
      ]);
    });

    it('says nothing about the order for ordering with only one answer', () => {
      const single = list(CorrectCriterion.SELECTED, [item('<p>A</p>'), item('<p></p>')]);
      expect(carryAnswers(single, format(CorrectCriterion.ORDERED)).losses).toEqual([]);
    });
  });

  describe('from accepted answers', () => {
    const answers = list(
      CorrectCriterion.ACCEPTED,
      [item('Paris', true), item('paris', true)],
      ContentLevel.PLAIN,
    );

    it('marks every answer correct for a selected type', () => {
      const result = carryAnswers(answers, format(CorrectCriterion.SELECTED));
      expect(summary(result.answers.items)).toEqual([
        ['<p>Paris</p>', true],
        ['<p>paris</p>', true],
      ]);
      expect(result.losses).toEqual([]);
    });

    it('keeps every answer for another accepted type', () => {
      const result = carryAnswers(answers, {
        correctCriterion: CorrectCriterion.ACCEPTED,
        contentLevel: ContentLevel.PLAIN,
      });
      expect(summary(result.answers.items)).toEqual([
        ['Paris', true],
        ['paris', true],
      ]);
      expect(result.losses).toEqual([]);
    });

    it('keeps every answer for ordering, saying the order becomes the correct answer', () => {
      const result = carryAnswers(answers, format(CorrectCriterion.ORDERED));
      expect(result.answers.items).toHaveLength(2);
      expect(result.losses).toEqual([ConversionLoss.ORDER_BECOMES_ANSWER]);
    });
  });

  describe('from ordered answers', () => {
    const answers = list(CorrectCriterion.ORDERED, [item('<p>1</p>'), item('<p>2</p>')]);

    it('keeps every answer, unmarked, for a selected type, saying the order goes', () => {
      const result = carryAnswers(answers, format(CorrectCriterion.SELECTED));
      expect(summary(result.answers.items)).toEqual([
        ['<p>1</p>', false],
        ['<p>2</p>', false],
      ]);
      expect(result.losses).toEqual([ConversionLoss.ORDER_NOT_KEPT]);
    });

    it('removes every answer for an accepted type, since none was accepted', () => {
      const result = carryAnswers(answers, {
        correctCriterion: CorrectCriterion.ACCEPTED,
        contentLevel: ContentLevel.PLAIN,
      });
      expect(result.answers.items).toEqual([]);
      expect(result.losses).toEqual([ConversionLoss.ANSWERS_REMOVED]);
    });

    it('keeps every answer for another ordered type', () => {
      expect(carryAnswers(answers, format(CorrectCriterion.ORDERED)).losses).toEqual([]);
    });
  });

  describe('into single choice', () => {
    it('keeps the first correct answer marked, saying the others lose their mark', () => {
      const answers = list(CorrectCriterion.SELECTED, [
        item('<p>A</p>'),
        item('<p>B</p>', true),
        item('<p>C</p>', true),
      ]);
      const result = carryAnswers(answers, format(CorrectCriterion.SELECTED, { single: true }));
      expect(summary(result.answers.items)).toEqual([
        ['<p>A</p>', false],
        ['<p>B</p>', true],
        ['<p>C</p>', false],
      ]);
      expect(result.losses).toEqual([ConversionLoss.CORRECT_ANSWERS_REDUCED]);
    });

    it('keeps the mark on an answer with content over a blank one marked first', () => {
      const answers = list(CorrectCriterion.SELECTED, [
        item('<p></p>', true),
        item('<p>B</p>', true),
      ]);
      const result = carryAnswers(answers, format(CorrectCriterion.SELECTED, { single: true }));
      expect(summary(result.answers.items)).toEqual([
        ['<p></p>', false],
        ['<p>B</p>', true],
      ]);
      expect(result.losses).toEqual([]);
    });

    it('says nothing when only one answer was correct', () => {
      const answers = list(CorrectCriterion.SELECTED, [item('<p>A</p>', true), item('<p>B</p>')]);
      expect(
        carryAnswers(answers, format(CorrectCriterion.SELECTED, { single: true })).losses,
      ).toEqual([]);
    });

    it('marks none when none was correct', () => {
      const answers = list(CorrectCriterion.SELECTED, [item('<p>A</p>'), item('<p>B</p>')]);
      const result = carryAnswers(answers, format(CorrectCriterion.SELECTED, { single: true }));
      expect(result.answers.items.every(({ correct }) => !correct)).toBe(true);
    });

    it('keeps only the first of several accepted answers marked', () => {
      const answers = list(
        CorrectCriterion.ACCEPTED,
        [item('Paris', true), item('paris', true)],
        ContentLevel.PLAIN,
      );
      const result = carryAnswers(answers, format(CorrectCriterion.SELECTED, { single: true }));
      expect(summary(result.answers.items)).toEqual([
        ['<p>Paris</p>', true],
        ['<p>paris</p>', false],
      ]);
      expect(result.losses).toEqual([ConversionLoss.CORRECT_ANSWERS_REDUCED]);
    });
  });

  describe('content levels', () => {
    it('reads rich answers as plain text, saying formatting goes', () => {
      const answers = list(CorrectCriterion.SELECTED, [item('<p><b>Paris</b></p>', true)]);
      const result = carryAnswers(answers, {
        correctCriterion: CorrectCriterion.ACCEPTED,
        contentLevel: ContentLevel.PLAIN,
      });
      expect(summary(result.answers.items)).toEqual([['Paris', true]]);
      expect(result.losses).toEqual([ConversionLoss.FORMATTING_REMOVED]);
    });

    it('removes an answer that was only an image', () => {
      const answers = list(CorrectCriterion.SELECTED, [
        item('<p><img src="a.png"/></p>', true),
        item('<p>B</p>', true),
      ]);
      const result = carryAnswers(answers, {
        correctCriterion: CorrectCriterion.ACCEPTED,
        contentLevel: ContentLevel.PLAIN,
      });
      expect(summary(result.answers.items)).toEqual([['B', true]]);
      expect(result.losses).toEqual([
        ConversionLoss.ANY_CORRECT_ANSWER_ACCEPTED,
        ConversionLoss.FORMATTING_REMOVED,
      ]);
    });

    it('keeps plain text from a single paragraph without a loss', () => {
      const answers = list(CorrectCriterion.SELECTED, [item('<p>Paris</p>', true)]);
      expect(
        carryAnswers(answers, {
          correctCriterion: CorrectCriterion.ACCEPTED,
          contentLevel: ContentLevel.PLAIN,
        }).losses,
      ).toEqual([]);
    });
  });

  it('carries the answers that travel with each one, and the shuffle setting', () => {
    const answers = {
      ...list(
        CorrectCriterion.ACCEPTED,
        [{ content: 'H2O', correct: true, caseSensitive: true }],
        ContentLevel.PLAIN,
      ),
      shuffle: true,
    };
    const result = carryAnswers(answers, {
      correctCriterion: CorrectCriterion.ACCEPTED,
      contentLevel: ContentLevel.PLAIN,
    });
    expect(result.answers).toEqual({
      correctCriterion: CorrectCriterion.ACCEPTED,
      contentLevel: ContentLevel.PLAIN,
      items: [{ content: 'H2O', correct: true, caseSensitive: true }],
      shuffle: true,
    });
  });
});
