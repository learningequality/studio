import { CorrectCriterion, ContentLevel } from '../../../constants';
import {
  exportOrderingContent,
  getOrderingConversionFormat,
  importOrderingContent,
} from '../convert';

describe('ordering conversion', () => {
  it('takes rich ordered answers', () => {
    expect(getOrderingConversionFormat()).toEqual({
      answers: { correctCriterion: CorrectCriterion.ORDERED, contentLevel: ContentLevel.RICH },
    });
  });

  it('exports the items in their correct order and the layout, but not the shuffle setting', () => {
    const state = {
      prompt: '<p>Q</p>',
      items: [
        { id: 'order_a', content: '<p>1</p>', fixed: true },
        { id: 'order_b', content: '<p>2</p>' },
      ],
      shuffle: false,
      orientation: 'horizontal',
    };
    expect(exportOrderingContent(state)).toEqual({
      prompt: '<p>Q</p>',
      answers: {
        correctCriterion: CorrectCriterion.ORDERED,
        contentLevel: ContentLevel.RICH,
        items: [
          { content: '<p>1</p>', correct: false, fixed: true },
          { content: '<p>2</p>', correct: false, fixed: false },
        ],
        orientation: 'horizontal',
      },
    });
  });

  it('imports each answer as a new item, and stays shuffled', () => {
    const state = importOrderingContent({
      prompt: '<p>Q</p>',
      answers: { items: [{ content: '<p>1</p>', correct: true }], shuffle: false },
    });
    expect(state.items).toEqual([
      { id: expect.stringMatching(/^order_/), content: '<p>1</p>', fixed: false },
    ]);
    expect(state.shuffle).toBe(true);
  });

  it('starts with one blank item when there are no answers', () => {
    expect(importOrderingContent({ prompt: '' }).items).toEqual([
      { id: expect.stringMatching(/^order_/), content: '' },
    ]);
  });
});
