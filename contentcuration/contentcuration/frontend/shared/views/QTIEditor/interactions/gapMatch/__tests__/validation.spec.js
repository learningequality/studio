import { validateGapMatchInteraction as validate } from '../validation';
import { ValidationError } from '../../../constants';
import { richTextComparisonKey } from 'shared/views/TipTapEditor/TipTapEditor/utils/comparisonKey';

const gap = (id, answer) =>
  `<qti-gap identifier="${id}" data-studio-correct="choice_${id}">${answer}</qti-gap>`;
const distractor = (id, content) => ({ id, content });

function makeState(overrides = {}) {
  return {
    responseIdentifier: 'RESPONSE',
    prompt: '<p>Identify the missing words.</p>',
    passage: `<p>Now is the ${gap('gap_a', 'winter')} of our ${gap('gap_b', 'spring')}</p>`,
    distractors: [distractor('choice_summer', 'summer')],
    ...overrides,
  };
}

const errorsWith = (state, code) => validate(state).filter(e => e.code === code);

describe('validateGapMatchInteraction()', () => {
  it('returns an empty array for a valid state', () => {
    expect(validate(makeState())).toEqual([]);
  });

  it('accepts an empty question', () => {
    expect(validate(makeState({ prompt: '' }))).toEqual([]);
  });

  it('accepts two gaps with the same answer', () => {
    const passage = `<p>${gap('gap_a', 'winter')} ${gap('gap_b', 'winter')}</p>`;
    expect(validate(makeState({ passage }))).toEqual([]);
  });

  describe('NO_CORRECT_ANSWER', () => {
    it.each(['', '<p>Now is the winter of our discontent</p>'])(
      'flags a passage with no gaps: %p',
      passage => {
        expect(validate(makeState({ passage }))).toContainEqual({
          code: ValidationError.NO_CORRECT_ANSWER,
        });
      },
    );
  });

  describe('EMPTY_ANSWER_CONTENT', () => {
    it('flags a gap with no answer by its gap identifier', () => {
      const passage = `<p>${gap('gap_a', 'winter')} <qti-gap identifier="gap_b"></qti-gap></p>`;
      expect(errorsWith(makeState({ passage }), ValidationError.EMPTY_ANSWER_CONTENT)).toEqual([
        { code: ValidationError.EMPTY_ANSWER_CONTENT, id: 'gap_b' },
      ]);
    });

    it('flags a gap whose answer is only whitespace', () => {
      const passage = `<p>${gap('gap_a', '&nbsp; ')}</p>`;
      expect(errorsWith(makeState({ passage }), ValidationError.EMPTY_ANSWER_CONTENT)).toEqual([
        { code: ValidationError.EMPTY_ANSWER_CONTENT, id: 'gap_a' },
      ]);
    });

    it('does not flag a math-only answer', () => {
      const passage = `<p>${gap('gap_a', '<span data-latex="x^2"></span>')}</p>`;
      expect(validate(makeState({ passage }))).toEqual([]);
    });
  });

  describe('EMPTY_CHOICE_CONTENT', () => {
    it('flags a blank distractor by its identifier', () => {
      const distractors = [distractor('choice_summer', 'summer'), distractor('choice_blank', '')];
      expect(errorsWith(makeState({ distractors }), ValidationError.EMPTY_CHOICE_CONTENT)).toEqual([
        { code: ValidationError.EMPTY_CHOICE_CONTENT, id: 'choice_blank' },
      ]);
    });
  });

  describe('DUPLICATE_DISTRACTOR_CONTENT', () => {
    it('flags a distractor with the same content as an answer', () => {
      const distractors = [distractor('choice_copy', '<strong>winter</strong>')];
      expect(
        errorsWith(makeState({ distractors }), ValidationError.DUPLICATE_DISTRACTOR_CONTENT),
      ).toEqual([
        {
          code: ValidationError.DUPLICATE_DISTRACTOR_CONTENT,
          text: richTextComparisonKey('winter'),
        },
      ]);
    });

    it('flags two distractors with the same content once', () => {
      const distractors = [
        distractor('choice_summer', 'summer'),
        distractor('choice_copy', 'summer'),
      ];
      expect(
        errorsWith(makeState({ distractors }), ValidationError.DUPLICATE_DISTRACTOR_CONTENT),
      ).toEqual([
        {
          code: ValidationError.DUPLICATE_DISTRACTOR_CONTENT,
          text: richTextComparisonKey('summer'),
        },
      ]);
    });

    it('does not compare blank distractors', () => {
      const distractors = [distractor('choice_one', ''), distractor('choice_two', '')];
      expect(
        errorsWith(makeState({ distractors }), ValidationError.DUPLICATE_DISTRACTOR_CONTENT),
      ).toEqual([]);
    });
  });
});
