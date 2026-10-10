import {
  exportAssociateContent,
  getAssociateConversionFormat,
  importAssociateContent,
} from '../convert';

const choice = content => ({ id: expect.stringMatching(/^choice_/), content });

describe('associate conversion', () => {
  it('takes pairs, and keeps a shuffle, its choices being always shuffled', () => {
    expect(getAssociateConversionFormat()).toEqual({ pairs: true, settings: { shuffle: true } });
  });

  it('exports each pair from its first choice to its second, and the distractors', () => {
    const state = {
      prompt: '<p>Q</p>',
      pairs: [
        [
          { id: 'choice_a', content: '<p>A</p>' },
          { id: 'choice_b', content: '<p>B</p>' },
        ],
      ],
      distractors: [{ id: 'choice_c', content: '<p>C</p>' }],
    };
    expect(exportAssociateContent(state)).toEqual({
      prompt: '<p>Q</p>',
      pairs: {
        items: [{ source: '<p>A</p>', target: '<p>B</p>' }],
        distractors: ['<p>C</p>'],
      },
    });
  });

  it('imports each pair and distractor as new choices', () => {
    const state = importAssociateContent({
      prompt: '<p>Q</p>',
      pairs: { items: [{ source: '<p>A</p>', target: '<p>B</p>' }], distractors: ['<p>C</p>'] },
    });
    expect(state.prompt).toBe('<p>Q</p>');
    expect(state.pairs).toEqual([[choice('<p>A</p>'), choice('<p>B</p>')]]);
    expect(state.distractors).toEqual([choice('<p>C</p>')]);
  });

  it('starts with one blank pair and no distractors when there are no pairs', () => {
    const state = importAssociateContent({ prompt: '' });
    expect(state.pairs).toEqual([[choice(''), choice('')]]);
    expect(state.distractors).toEqual([]);
  });
});
