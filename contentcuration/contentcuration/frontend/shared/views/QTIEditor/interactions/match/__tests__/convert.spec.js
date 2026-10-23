import { exportMatchContent, importMatchContent } from '../convert';

describe('match conversion', () => {
  it('exports one pair per match, and a row with no match yet as a pair with nothing', () => {
    const state = {
      prompt: '<p>Q</p>',
      rows: [
        {
          id: 'row_a',
          content: '<p>Bat</p>',
          matches: [
            { id: 'choice_m', content: '<p>Mammal</p>' },
            { id: 'choice_f', content: '<p>Flyer</p>' },
          ],
        },
        { id: 'row_b', content: '<p>Frog</p>', matches: [] },
      ],
      distractors: [{ id: 'choice_r', content: '<p>Reptile</p>' }],
    };
    expect(exportMatchContent(state)).toEqual({
      prompt: '<p>Q</p>',
      pairs: {
        items: [
          { source: '<p>Bat</p>', target: '<p>Mammal</p>' },
          { source: '<p>Bat</p>', target: '<p>Flyer</p>' },
          { source: '<p>Frog</p>', target: '' },
        ],
        distractors: ['<p>Reptile</p>'],
      },
    });
  });

  it('imports each pair as a row of its own, with its target as the match', () => {
    const state = importMatchContent({
      prompt: '<p>Q</p>',
      pairs: { items: [{ source: '<p>A</p>', target: '<p>B</p>' }], distractors: ['<p>C</p>'] },
    });
    expect(state.rows).toEqual([
      {
        id: expect.stringMatching(/^row_/),
        content: '<p>A</p>',
        matches: [{ id: expect.stringMatching(/^choice_/), content: '<p>B</p>' }],
      },
    ]);
    expect(state.distractors).toEqual([
      { id: expect.stringMatching(/^choice_/), content: '<p>C</p>' },
    ]);
  });

  it('gathers pairs from the same source into one row, matched to each target', () => {
    const state = importMatchContent({
      prompt: '',
      pairs: {
        items: [
          { source: '<p>Bat</p>', target: '<p>Mammal</p>' },
          { source: '<p>Dog</p>', target: '<p>Mammal</p>' },
          { source: '<p><strong>Bat</strong></p>', target: '<p>Flyer</p>' },
          { source: '<p>Bat</p>', target: '<p>Flyer</p>' },
        ],
        distractors: [],
      },
    });
    expect(
      state.rows.map(({ content, matches }) => [content, matches.map(m => m.content)]),
    ).toEqual([
      ['<p>Bat</p>', ['<p>Mammal</p>', '<p>Flyer</p>']],
      ['<p>Dog</p>', ['<p>Mammal</p>']],
    ]);
  });

  it('keeps rows with no source apart, each with a match to fill in', () => {
    const state = importMatchContent({
      prompt: '',
      pairs: {
        items: [
          { source: '', target: '' },
          { source: '<p></p>', target: '<p>B</p>' },
        ],
        distractors: [],
      },
    });
    expect(state.rows.map(({ matches }) => matches.map(m => m.content))).toEqual([
      [''],
      ['<p>B</p>'],
    ]);
  });

  it('starts with one blank row when there are no pairs', () => {
    const state = importMatchContent({ prompt: '' });
    expect(state.rows).toHaveLength(1);
    expect(state.rows[0].content).toBe('');
    expect(state.distractors).toEqual([]);
  });
});
