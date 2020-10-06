import each from 'jest-each';

import { insertBefore, insertAfter, swapElements } from './helpers';

describe('insertBefore', () => {
  each([
    [[], 0, 'pink', ['pink']],
    [['blue', 'yellow', 'violet'], -1, 'pink', ['pink', 'blue', 'yellow', 'violet']],
    [['blue', 'yellow', 'violet'], 0, 'pink', ['pink', 'blue', 'yellow', 'violet']],
    [['blue', 'yellow', 'violet'], 1, 'pink', ['blue', 'pink', 'yellow', 'violet']],
  ]).it('inserts a new item before another item', (arr, idx, item, expected) => {
    expect(insertBefore(arr, idx, item)).toEqual(expected);
  });
});

describe('insertAfter', () => {
  each([
    [[], 2, 'pink', ['pink']],
    [['blue', 'yellow', 'violet'], 3, 'pink', ['blue', 'yellow', 'violet', 'pink']],
    [['blue', 'yellow', 'violet'], 2, 'pink', ['blue', 'yellow', 'violet', 'pink']],
    [['blue', 'yellow', 'violet'], 1, 'pink', ['blue', 'yellow', 'pink', 'violet']],
  ]).it('inserts a new item after another item', (arr, idx, item, expected) => {
    expect(insertAfter(arr, idx, item)).toEqual(expected);
  });
});

describe('swapElements', () => {
  each([
    [['blue', 'yellow', 'violet'], 0, 0, ['blue', 'yellow', 'violet']],
    [['blue', 'yellow', 'violet'], 0, 2, ['violet', 'yellow', 'blue']],
  ]).it('swaps two elements', (arr, idx1, idx2, expected) => {
    expect(swapElements(arr, idx1, idx2)).toEqual(expected);
  });
});
