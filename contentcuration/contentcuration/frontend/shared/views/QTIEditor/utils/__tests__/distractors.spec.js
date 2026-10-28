import { duplicateDistractorErrors } from '../distractors';
import { ValidationError } from '../../constants';

const duplicate = text => ({ code: ValidationError.DUPLICATE_DISTRACTOR_CONTENT, text });
const filled = (...keys) => keys.map(key => ({ filled: true, key }));
const blank = { filled: false, key: '[]' };

describe('duplicateDistractorErrors', () => {
  it('returns no errors when every distractor is unique', () => {
    expect(duplicateDistractorErrors(filled('a', 'b'), filled('c', 'd'))).toEqual([]);
  });

  it('flags a distractor that repeats an answer', () => {
    expect(duplicateDistractorErrors(filled('a', 'b'), filled('b', 'c'))).toEqual([duplicate('b')]);
  });

  it('flags distractors that repeat each other once', () => {
    expect(duplicateDistractorErrors(filled('a'), filled('c', 'c', 'c'))).toEqual([duplicate('c')]);
  });

  it('does not flag answers that repeat each other', () => {
    expect(duplicateDistractorErrors(filled('a', 'a'), filled('b'))).toEqual([]);
  });

  it('does not compare blank choices', () => {
    expect(duplicateDistractorErrors([blank], [blank, blank])).toEqual([]);
  });

  it('lists the repeated distractors in the order they appear', () => {
    expect(duplicateDistractorErrors(filled('a'), filled('d', 'a', 'd'))).toEqual([
      duplicate('d'),
      duplicate('a'),
    ]);
  });
});
