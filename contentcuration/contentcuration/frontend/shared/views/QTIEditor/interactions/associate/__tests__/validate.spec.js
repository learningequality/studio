import { validateAssociateInteraction } from '../validate';
import { ValidationError } from '../../../constants';

function makeState(overrides = {}) {
  return {
    prompt: '<p>Match each character to his adversary.</p>',
    pairs: [
      [
        { id: 'choice_aaa11111', content: 'Antonio' },
        { id: 'choice_bbb22222', content: 'Prospero' },
      ],
    ],
    distractors: [{ id: 'choice_eee55555', content: 'Lysander' }],
    ...overrides,
  };
}

const errorCodes = errors => errors.map(e => e.code);

describe('validateAssociateInteraction()', () => {
  it('returns an empty array for a valid state', () => {
    expect(validateAssociateInteraction(makeState())).toEqual([]);
  });

  describe('PROMPT_REQUIRED', () => {
    it('returns error when the prompt is empty', () => {
      expect(errorCodes(validateAssociateInteraction(makeState({ prompt: '' })))).toContain(
        ValidationError.PROMPT_REQUIRED,
      );
    });

    it('returns error when the prompt is tags-and-whitespace only', () => {
      expect(
        errorCodes(validateAssociateInteraction(makeState({ prompt: '<p>   </p>' }))),
      ).toContain(ValidationError.PROMPT_REQUIRED);
    });
  });

  describe('EMPTY_CHOICE_CONTENT', () => {
    it('flags a blank pair member by id and leaves the pair invalid', () => {
      const state = makeState({
        pairs: [
          [
            { id: 'choice_aaa11111', content: 'Antonio' },
            { id: 'choice_bbb22222', content: '  ' },
          ],
        ],
      });
      const errors = validateAssociateInteraction(state);
      expect(errors).toContainEqual({
        code: ValidationError.EMPTY_CHOICE_CONTENT,
        id: 'choice_bbb22222',
      });
      expect(errorCodes(errors)).toContain(ValidationError.TOO_FEW_PAIRS);
    });

    it('flags a blank distractor by id without invalidating the pairs', () => {
      const state = makeState({ distractors: [{ id: 'choice_eee55555', content: '<p></p>' }] });
      const errors = validateAssociateInteraction(state);
      expect(errors).toContainEqual({
        code: ValidationError.EMPTY_CHOICE_CONTENT,
        id: 'choice_eee55555',
      });
      expect(errorCodes(errors)).not.toContain(ValidationError.TOO_FEW_PAIRS);
    });
  });

  describe('DUPLICATE_PAIR_CONTENT', () => {
    it('flags a pair whose two members hold the same content, by pair index', () => {
      const state = makeState({
        pairs: [
          [
            { id: 'choice_aaa11111', content: 'Antonio' },
            { id: 'choice_bbb22222', content: 'Antonio' },
          ],
        ],
      });
      const errors = validateAssociateInteraction(state);
      expect(errors).toContainEqual({ code: ValidationError.DUPLICATE_PAIR_CONTENT, index: 0 });
      expect(errorCodes(errors)).toContain(ValidationError.TOO_FEW_PAIRS);
    });

    it('treats content differing only by markup as duplicate', () => {
      const state = makeState({
        pairs: [
          [
            { id: 'choice_aaa11111', content: 'Antonio' },
            { id: 'choice_bbb22222', content: '<b>Antonio</b>' },
          ],
        ],
      });
      expect(errorCodes(validateAssociateInteraction(state))).toContain(
        ValidationError.DUPLICATE_PAIR_CONTENT,
      );
    });

    it('does not flag a pair whose members are both blank', () => {
      const state = makeState({
        pairs: [
          [
            { id: 'choice_aaa11111', content: '' },
            { id: 'choice_bbb22222', content: '' },
          ],
        ],
      });
      expect(errorCodes(validateAssociateInteraction(state))).not.toContain(
        ValidationError.DUPLICATE_PAIR_CONTENT,
      );
    });

    it('does not flag content reused across two different pairs', () => {
      const state = makeState({
        pairs: [
          [
            { id: 'choice_aaa11111', content: 'Antonio' },
            { id: 'choice_bbb22222', content: 'Prospero' },
          ],
          [
            { id: 'choice_aaa11111', content: 'Antonio' },
            { id: 'choice_ccc33333', content: 'Capulet' },
          ],
        ],
      });
      expect(validateAssociateInteraction(state)).toEqual([]);
    });
  });

  describe('TOO_FEW_PAIRS', () => {
    it('returns error when there are no pairs at all', () => {
      expect(errorCodes(validateAssociateInteraction(makeState({ pairs: [] })))).toContain(
        ValidationError.TOO_FEW_PAIRS,
      );
    });

    it('returns error when every pair is invalid for a different reason', () => {
      const state = makeState({
        pairs: [
          [
            { id: 'choice_aaa11111', content: 'Antonio' },
            { id: 'choice_bbb22222', content: '' },
          ],
          [
            { id: 'choice_ccc33333', content: 'Capulet' },
            { id: 'choice_ddd44444', content: '<b>Capulet</b>' },
          ],
        ],
      });
      expect(errorCodes(validateAssociateInteraction(state))).toContain(
        ValidationError.TOO_FEW_PAIRS,
      );
    });

    it('does not return error when one valid pair sits among invalid ones', () => {
      const state = makeState({
        pairs: [
          [
            { id: 'choice_aaa11111', content: 'Antonio' },
            { id: 'choice_bbb22222', content: 'Antonio' },
          ],
          [
            { id: 'choice_ccc33333', content: '' },
            { id: 'choice_ddd44444', content: 'Prospero' },
          ],
          [
            { id: 'choice_eee55555', content: 'Capulet' },
            { id: 'choice_fff66666', content: 'Montague' },
          ],
        ],
      });
      expect(errorCodes(validateAssociateInteraction(state))).not.toContain(
        ValidationError.TOO_FEW_PAIRS,
      );
    });
  });
});
