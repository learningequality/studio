import { ContentLevel } from '../../../constants';
import {
  exportGapMatchContent,
  getGapMatchConversionFormat,
  importGapMatchContent,
} from '../convert';
import { getGaps } from '../parse';

const passageFacet = (blanks, distractors = []) => ({
  html: blanks.map((_, i) => `<span data-studio-blank="${i}"></span>`).join(' '),
  blanks,
  distractors,
  contentLevel: ContentLevel.INLINE,
});

describe('gap match conversion', () => {
  it('takes an inline passage, and keeps a shuffle, its pool being always shuffled', () => {
    expect(getGapMatchConversionFormat()).toEqual({
      passage: { contentLevel: ContentLevel.INLINE },
      settings: { shuffle: true },
    });
  });

  it('exports each gap as a blank, its content the answer, and the pool as distractors', () => {
    const state = {
      prompt: '<p>Q</p>',
      passage:
        '<p>The <qti-gap identifier="gap_a" data-studio-correct="choice_a"><em>Sun</em></qti-gap>' +
        ' and <qti-gap identifier="gap_b"></qti-gap></p>',
      distractors: [{ id: 'choice_moon', content: 'Moon' }],
    };
    expect(exportGapMatchContent(state)).toEqual({
      prompt: '<p>Q</p>',
      passage: {
        html: '<p>The <span data-studio-blank="0"></span> and <span data-studio-blank="1"></span></p>',
        blanks: [
          { answer: '<em>Sun</em>', options: [] },
          { answer: null, options: [] },
        ],
        distractors: ['Moon'],
        contentLevel: ContentLevel.INLINE,
      },
    });
  });

  it('reads each answer as the build does, leaving out comments and scripts', () => {
    const state = {
      prompt: '',
      passage: '<p><qti-gap identifier="gap_a">Sun<!-- note --><script>x</script></qti-gap></p>',
      distractors: [],
    };
    expect(exportGapMatchContent(state).passage.blanks).toEqual([{ answer: 'Sun', options: [] }]);
  });

  it('imports each blank as a gap holding its answer, and an unanswered one as an empty gap', () => {
    const state = importGapMatchContent({
      prompt: '<p>Q</p>',
      passage: passageFacet([
        { answer: 'Sun', options: [] },
        { answer: null, options: [] },
      ]),
    });
    expect(state.prompt).toBe('<p>Q</p>');
    expect(getGaps(state.passage).map(({ answer }) => answer)).toEqual(['Sun', '']);
    expect(state.distractors).toEqual([]);
  });

  it('pools every blank’s options with the distractors, each once and none an answer', () => {
    const state = importGapMatchContent({
      prompt: '',
      passage: passageFacet(
        [
          { answer: 'Sun', options: ['Moon', 'Star'] },
          { answer: 'Moon', options: ['Sun', 'Star', 'Comet'] },
        ],
        ['Comet', 'Planet', ''],
      ),
    });
    expect(state.distractors.map(({ content }) => content)).toEqual(['Star', 'Comet', 'Planet']);
  });

  it('keeps the question alone when there is no passage to import', () => {
    expect(importGapMatchContent({ prompt: '<p>Q</p>' })).toEqual({
      responseIdentifier: 'RESPONSE',
      prompt: '<p>Q</p>',
      passage: '',
      distractors: [],
    });
  });
});
