import { validateMatchInteraction as validate } from '../validation';
import { ValidationError } from '../../../constants';
import { richTextComparisonKey } from '../../../utils/richText';

const row = (index, content, matches) => ({ id: `row_${index}`, content, matches });
const answer = (id, content) => ({ id, content });

function makeState(overrides = {}) {
  return {
    prompt: '<p>Match each animal to its biological classification class.</p>',
    rows: [
      row(0, 'Dog', [answer('choice_mammal', 'Mammal')]),
      row(1, 'Eagle', [answer('choice_bird', 'Bird')]),
    ],
    distractors: [answer('choice_reptile', 'Reptile')],
    ...overrides,
  };
}

const errorCodes = errors => errors.map(e => e.code);
const errorsWith = (state, code) => validate(state).filter(e => e.code === code);

describe('validateMatchInteraction()', () => {
  it('returns an empty array for a valid state', () => {
    expect(validate(makeState())).toEqual([]);
  });

  describe('PROMPT_REQUIRED', () => {
    it('returns error when the prompt is empty', () => {
      expect(errorCodes(validate(makeState({ prompt: '' })))).toContain(
        ValidationError.PROMPT_REQUIRED,
      );
    });

    it('returns error when the prompt is tags-and-whitespace only', () => {
      expect(errorCodes(validate(makeState({ prompt: '<p>   </p>' })))).toContain(
        ValidationError.PROMPT_REQUIRED,
      );
    });
  });

  describe('EMPTY_ROW_CONTENT', () => {
    it('flags a blank row prompt by row index', () => {
      const rows = [makeState().rows[0], row(1, '<p></p>', [answer('choice_bird', 'Bird')])];
      expect(errorsWith(makeState({ rows }), ValidationError.EMPTY_ROW_CONTENT)).toEqual([
        { code: ValidationError.EMPTY_ROW_CONTENT, index: 1 },
      ]);
    });

    it('does not flag an image-only row prompt', () => {
      const rows = [row(0, '<img src="dog.png">', [answer('choice_mammal', 'Mammal')])];
      expect(validate(makeState({ rows }))).toEqual([]);
    });
  });

  describe('EMPTY_CHOICE_CONTENT', () => {
    it('flags a blank answer by id', () => {
      const rows = [
        row(0, 'Dog', [answer('choice_mammal', 'Mammal'), answer('choice_blank', '<p> </p>')]),
      ];
      expect(errorsWith(makeState({ rows }), ValidationError.EMPTY_CHOICE_CONTENT)).toEqual([
        { code: ValidationError.EMPTY_CHOICE_CONTENT, id: 'choice_blank' },
      ]);
    });

    it('flags a blank distractor by id', () => {
      const distractors = [answer('choice_blank', '')];
      expect(errorsWith(makeState({ distractors }), ValidationError.EMPTY_CHOICE_CONTENT)).toEqual([
        { code: ValidationError.EMPTY_CHOICE_CONTENT, id: 'choice_blank' },
      ]);
    });

    it('does not flag an image-only or formula-only answer', () => {
      const rows = [
        row(0, 'Dog', [answer('choice_img', '<img src="mammal.png">')]),
        row(1, 'Square', [answer('choice_math', '<span data-latex="x^2"></span>')]),
      ];
      expect(validate(makeState({ rows }))).toEqual([]);
    });
  });

  describe('ROW_WITHOUT_MATCH', () => {
    it('flags a row with no answers by row index', () => {
      const rows = [makeState().rows[0], row(1, 'Eagle', [])];
      expect(errorsWith(makeState({ rows }), ValidationError.ROW_WITHOUT_MATCH)).toEqual([
        { code: ValidationError.ROW_WITHOUT_MATCH, index: 1 },
      ]);
    });

    it('flags a row whose only answers are blank', () => {
      const rows = [makeState().rows[0], row(1, 'Eagle', [answer('choice_blank', '')])];
      expect(errorsWith(makeState({ rows }), ValidationError.ROW_WITHOUT_MATCH)).toEqual([
        { code: ValidationError.ROW_WITHOUT_MATCH, index: 1 },
      ]);
    });
  });

  describe('TOO_FEW_ROWS', () => {
    it('fires when there are no rows', () => {
      expect(errorCodes(validate(makeState({ rows: [] })))).toContain(ValidationError.TOO_FEW_ROWS);
    });

    it('fires when no row has both a filled prompt and a filled answer', () => {
      const rows = [
        row(0, '', [answer('choice_mammal', 'Mammal')]),
        row(1, 'Eagle', [answer('choice_blank', '')]),
      ];
      expect(errorCodes(validate(makeState({ rows })))).toContain(ValidationError.TOO_FEW_ROWS);
    });

    it('does not fire when one valid row sits among invalid ones', () => {
      const rows = [
        row(0, '', [answer('choice_mammal', 'Mammal')]),
        row(1, 'Eagle', [answer('choice_bird', 'Bird')]),
        row(2, 'Frog', []),
      ];
      expect(errorCodes(validate(makeState({ rows })))).not.toContain(ValidationError.TOO_FEW_ROWS);
    });
  });

  describe('DUPLICATE_MATCH_CONTENT', () => {
    it('flags two answers in one row that differ only in markup', () => {
      const rows = [
        makeState().rows[0],
        row(1, 'Eagle', [
          answer('choice_a', 'Bird'),
          answer('choice_b', '<p><strong>Bird</strong></p>'),
        ]),
      ];
      expect(errorsWith(makeState({ rows }), ValidationError.DUPLICATE_MATCH_CONTENT)).toEqual([
        {
          code: ValidationError.DUPLICATE_MATCH_CONTENT,
          index: 1,
          text: richTextComparisonKey('Bird'),
        },
      ]);
    });

    it('does not treat two blank answers as duplicates', () => {
      const rows = [
        row(0, 'Dog', [
          answer('choice_mammal', 'Mammal'),
          answer('choice_a', ''),
          answer('choice_b', '<p></p>'),
        ]),
      ];
      expect(errorCodes(validate(makeState({ rows })))).not.toContain(
        ValidationError.DUPLICATE_MATCH_CONTENT,
      );
    });
  });

  describe('DUPLICATE_ROW_CONTENT', () => {
    it('flags each row sharing a prompt', () => {
      const rows = [
        row(0, 'Dog', [answer('choice_mammal', 'Mammal')]),
        row(1, 'Eagle', [answer('choice_bird', 'Bird')]),
        row(2, '<p>Dog</p>', [answer('choice_fur', 'Fur')]),
      ];
      expect(errorsWith(makeState({ rows }), ValidationError.DUPLICATE_ROW_CONTENT)).toEqual([
        { code: ValidationError.DUPLICATE_ROW_CONTENT, index: 0 },
        { code: ValidationError.DUPLICATE_ROW_CONTENT, index: 2 },
      ]);
    });

    it('does not treat two blank prompts as duplicates', () => {
      const rows = [...makeState().rows, row(2, '', []), row(3, '<p></p>', [])];
      expect(errorCodes(validate(makeState({ rows })))).not.toContain(
        ValidationError.DUPLICATE_ROW_CONTENT,
      );
    });
  });

  describe('DUPLICATE_DISTRACTOR_CONTENT', () => {
    const duplicates = state => errorsWith(state, ValidationError.DUPLICATE_DISTRACTOR_CONTENT);

    it('flags a distractor repeating another distractor, once per text', () => {
      const distractors = [
        answer('choice_a', 'Reptile'),
        answer('choice_b', 'Reptile'),
        answer('choice_c', '<p>Reptile</p>'),
      ];
      expect(duplicates(makeState({ distractors }))).toEqual([
        {
          code: ValidationError.DUPLICATE_DISTRACTOR_CONTENT,
          text: richTextComparisonKey('Reptile'),
        },
      ]);
    });

    it('flags a distractor repeating an answer in any row', () => {
      const distractors = [answer('choice_other', 'Bird')];
      expect(duplicates(makeState({ distractors }))).toEqual([
        { code: ValidationError.DUPLICATE_DISTRACTOR_CONTENT, text: richTextComparisonKey('Bird') },
      ]);
    });

    it('does not treat two blank distractors as duplicates', () => {
      const distractors = [answer('choice_a', ''), answer('choice_b', '')];
      expect(duplicates(makeState({ distractors }))).toEqual([]);
    });
  });

  describe('not errors', () => {
    it('allows the same answer in two rows', () => {
      const rows = [
        row(0, 'Dog', [answer('choice_mammal', 'Mammal')]),
        row(1, 'Whale', [answer('choice_mammal', 'Mammal')]),
      ];
      expect(validate(makeState({ rows }))).toEqual([]);
    });

    it('allows a row prompt equal to an answer', () => {
      const rows = [row(0, 'Mammal', [answer('choice_mammal', 'Mammal')])];
      expect(validate(makeState({ rows }))).toEqual([]);
    });
  });
});
