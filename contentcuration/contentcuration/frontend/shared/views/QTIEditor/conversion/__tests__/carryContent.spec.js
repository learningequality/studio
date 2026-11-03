import { CorrectCriterion, ContentLevel, ConversionLoss } from '../../constants';
import { carryContent } from '../index';

const answers = {
  correctCriterion: CorrectCriterion.SELECTED,
  contentLevel: ContentLevel.RICH,
  items: [
    { content: '<p>A</p>', correct: true },
    { content: '<p>B</p>', correct: false },
  ],
};
const pairs = { items: [{ source: '<p>Dog</p>', target: '<p>Mammal</p>' }], distractors: [] };
const passage = {
  html: '<p>The <span data-studio-blank="0"></span> is blue.</p>',
  blanks: [{ answer: 'sky', options: [] }],
  distractors: [],
  contentLevel: ContentLevel.PLAIN,
};

describe('carryContent', () => {
  it('always carries the question', () => {
    expect(carryContent({ prompt: '<p>Q</p>' }, {})).toEqual({
      carried: { prompt: '<p>Q</p>' },
      losses: [],
    });
  });

  it('carries answers into a type that takes them, with the losses that brings', () => {
    const { carried, losses } = carryContent(
      { prompt: '', answers },
      {
        answers: { correctCriterion: CorrectCriterion.ACCEPTED, contentLevel: ContentLevel.PLAIN },
      },
    );
    expect(carried.answers.items).toEqual([{ content: 'A', correct: true }]);
    expect(losses).toEqual([ConversionLoss.INCORRECT_ANSWERS_REMOVED]);
  });

  it.each([
    ['answers', { answers }],
    ['pairs', { pairs }],
  ])('drops %s a type does not take, saying the answers go', (_, facet) => {
    const { carried, losses } = carryContent({ prompt: '<p>Q</p>', ...facet }, {});
    expect(carried).toEqual({ prompt: '<p>Q</p>' });
    expect(losses).toEqual([ConversionLoss.ANSWERS_REMOVED]);
  });

  it('drops empty answers a type does not take without a loss', () => {
    const blank = { ...answers, items: [{ content: '<p></p>', correct: false }] };
    expect(carryContent({ prompt: '', answers: blank }, {}).losses).toEqual([]);
  });

  it('drops pairs that hold nothing without a loss', () => {
    const blank = { items: [{ source: '', target: '<p></p>' }], distractors: [] };
    expect(carryContent({ prompt: '', pairs: blank }, {}).losses).toEqual([]);
  });

  it('carries pairs into a type that takes them, as they are', () => {
    expect(carryContent({ prompt: '', pairs }, { pairs: true }).carried.pairs).toBe(pairs);
  });

  it('folds a passage into the question for a type with no passage', () => {
    const { carried, losses } = carryContent({ prompt: '<p>Q</p>', passage }, {});
    expect(carried).toEqual({ prompt: '<p>Q</p><p>The _____ is blue.</p>' });
    expect(losses).toEqual([ConversionLoss.PASSAGE_ADDED_TO_QUESTION]);
  });

  it('leaves the question alone when the passage holds nothing', () => {
    const empty = { ...passage, html: '<p></p>', blanks: [] };
    expect(carryContent({ prompt: '<p>Q</p>', passage: empty }, {})).toEqual({
      carried: { prompt: '<p>Q</p>' },
      losses: [],
    });
  });

  it('carries a passage into a type that takes one', () => {
    const { carried, losses } = carryContent(
      { prompt: '', passage },
      { passage: { contentLevel: ContentLevel.INLINE } },
    );
    expect(carried.passage.blanks).toEqual([{ answer: 'sky', options: [] }]);
    expect(losses).toEqual([]);
  });

  it('reports each loss once, in the order the author is told about them', () => {
    const rich = {
      correctCriterion: CorrectCriterion.SELECTED,
      contentLevel: ContentLevel.RICH,
      items: [
        { content: '<p><b>A</b></p>', correct: true },
        { content: '<p>B</p>', correct: false },
        { content: '<p><i>C</i></p>', correct: true },
      ],
    };
    const { losses } = carryContent(
      { prompt: '', answers: rich },
      {
        answers: { correctCriterion: CorrectCriterion.ACCEPTED, contentLevel: ContentLevel.PLAIN },
      },
    );
    expect(losses).toEqual([
      ConversionLoss.INCORRECT_ANSWERS_REMOVED,
      ConversionLoss.ANY_CORRECT_ANSWER_ACCEPTED,
      ConversionLoss.FORMATTING_REMOVED,
    ]);
  });

  describe('settings', () => {
    // Settings the author changed, as each type exports them.
    const settings = { shuffle: true, showAnswerCount: false };

    it('carries the settings a type keeps, even into a type that takes no answers', () => {
      const { carried, losses } = carryContent(
        { prompt: '', answers, settings },
        { settings: { shuffle: false, showAnswerCount: true } },
      );
      expect(carried.settings).toEqual(settings);
      expect(losses).toEqual([ConversionLoss.ANSWERS_REMOVED]);
    });

    it('says settings go when one the author changed is not kept', () => {
      const { carried, losses } = carryContent(
        { prompt: '', settings },
        { settings: { shuffle: false } },
      );
      expect(carried.settings).toEqual({ shuffle: true });
      expect(losses).toEqual([ConversionLoss.SETTINGS_REMOVED]);
    });
  });
});
