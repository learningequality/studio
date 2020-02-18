import { removeDuplicatePairs } from '../utils';

describe('removeDuplicatePairs', () => {
  it('removes indentical pairs from an array', () => {
    expect(
      removeDuplicatePairs([
        ['food', 'chocolate'],
        ['drink', 'milk'],
        ['chocolate', 'food'],
        ['food', 'chocolate'],
      ])
    ).toEqual([
      ['drink', 'milk'],
      ['chocolate', 'food'],
      ['food', 'chocolate'],
    ]);
  });
});
