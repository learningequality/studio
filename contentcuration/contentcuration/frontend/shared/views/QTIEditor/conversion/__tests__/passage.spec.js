import { ContentLevel, ConversionLoss } from '../../constants';
import { BLANK_TEXT, carryPassage, foldPassage, passageHasContent } from '../passage';

const blank = i => `<span data-studio-blank="${i}"></span>`;
const passage = (overrides = {}) => ({
  html: `<p>The ${blank(0)} is ${blank(1)}.</p>`,
  blanks: [
    { answer: 'sky', options: ['sea'] },
    { answer: 'blue', options: [] },
  ],
  distractors: [],
  contentLevel: ContentLevel.PLAIN,
  ...overrides,
});

describe('foldPassage', () => {
  it('adds the passage after the question, each blank shown as underscores', () => {
    expect(foldPassage('<p>Fill in:</p>', passage().html)).toBe(
      `<p>Fill in:</p><p>The ${BLANK_TEXT} is ${BLANK_TEXT}.</p>`,
    );
  });

  it('replaces blanks inside formatting and lists', () => {
    const html = `<ul><li><strong>Now is the ${blank(0)}</strong></li></ul>`;
    expect(foldPassage('', html)).toBe(
      `<ul><li><strong>Now is the ${BLANK_TEXT}</strong></li></ul>`,
    );
  });

  it('adds a passage with no blanks as it is', () => {
    expect(foldPassage('<p>Q</p>', '<p>Just text</p>')).toBe('<p>Q</p><p>Just text</p>');
  });
});

describe('passageHasContent', () => {
  it('is false for an empty passage with no blanks', () => {
    expect(passageHasContent(passage({ html: '<p></p>', blanks: [] }))).toBe(false);
  });

  it('counts the passage text', () => {
    expect(passageHasContent(passage({ html: '<p>Text</p>', blanks: [] }))).toBe(true);
  });

  it('counts a blank holding an answer, even with no text around it', () => {
    const onlyBlank = passage({
      html: `<p>${blank(0)}</p>`,
      blanks: [{ answer: 'x', options: [] }],
    });
    expect(passageHasContent(onlyBlank)).toBe(true);
  });

  it('counts distractors', () => {
    const onlyDistractor = passage({ html: '', blanks: [], distractors: ['spare'] });
    expect(passageHasContent(onlyDistractor)).toBe(true);
  });
});

describe('carryPassage', () => {
  it('leaves a passage at the same level as it is', () => {
    const result = carryPassage(passage(), { contentLevel: ContentLevel.PLAIN });
    expect(result.passage).toEqual(passage());
    expect(result.losses).toEqual([]);
  });

  it('escapes plain answers for a passage type that holds inline content', () => {
    const plain = passage({ blanks: [{ answer: 'a < b', options: [] }], distractors: ['c & d'] });
    const result = carryPassage(plain, { contentLevel: ContentLevel.INLINE });
    expect(result.passage.blanks).toEqual([{ answer: 'a &lt; b', options: [] }]);
    expect(result.passage.distractors).toEqual(['c &amp; d']);
    expect(result.passage.contentLevel).toBe(ContentLevel.INLINE);
    expect(result.losses).toEqual([]);
  });

  it('flattens inline answers for a plain passage type, saying formatting goes', () => {
    const inline = passage({
      contentLevel: ContentLevel.INLINE,
      blanks: [{ answer: '<em>sky</em>', options: [] }],
      distractors: ['<span data-latex="x"></span>', 'sea'],
    });
    const result = carryPassage(inline, { contentLevel: ContentLevel.PLAIN });
    expect(result.passage.blanks).toEqual([{ answer: 'sky', options: [] }]);
    // A formula on its own has nothing left to show.
    expect(result.passage.distractors).toEqual(['sea']);
    expect(result.losses).toEqual([ConversionLoss.FORMATTING_REMOVED]);
  });

  it('keeps a blank with no answer as one with no answer', () => {
    const unanswered = passage({ blanks: [{ answer: null, options: ['a'] }] });
    expect(carryPassage(unanswered, { contentLevel: ContentLevel.INLINE }).passage.blanks).toEqual([
      { answer: null, options: ['a'] },
    ]);
  });
});
