import { validateOrderingInteraction } from '../validation';
import { ValidationError, Orientation } from '../../../constants';

function makeItem(overrides = {}) {
  return { id: 'order_aaa11111', content: 'Mercury', fixed: false, ...overrides };
}

function makeState(overrides = {}) {
  return {
    prompt: 'Order the planets.',
    items: [
      makeItem({ id: 'order_aaa11111', content: 'Mercury' }),
      makeItem({ id: 'order_bbb22222', content: 'Venus' }),
    ],
    orientation: Orientation.VERTICAL,
    shuffle: true,
    ...overrides,
  };
}

const errorCodes = errors => errors.map(e => e.code);

describe('validateOrderingInteraction()', () => {
  it('returns an empty array for a valid state', () => {
    expect(validateOrderingInteraction(makeState())).toEqual([]);
  });

  describe('PROMPT_REQUIRED', () => {
    it('returns error when prompt is empty', () => {
      expect(errorCodes(validateOrderingInteraction(makeState({ prompt: '' })))).toContain(
        ValidationError.PROMPT_REQUIRED,
      );
    });

    it('returns error when prompt is whitespace only', () => {
      expect(errorCodes(validateOrderingInteraction(makeState({ prompt: '   ' })))).toContain(
        ValidationError.PROMPT_REQUIRED,
      );
    });

    it('returns error when prompt is tags-only with no visible text', () => {
      expect(errorCodes(validateOrderingInteraction(makeState({ prompt: '<p> </p>' })))).toContain(
        ValidationError.PROMPT_REQUIRED,
      );
    });

    it('does not return error when prompt has visible text', () => {
      expect(
        errorCodes(validateOrderingInteraction(makeState({ prompt: '<p>Arrange these.</p>' }))),
      ).not.toContain(ValidationError.PROMPT_REQUIRED);
    });
  });

  describe('TOO_FEW_CHOICES', () => {
    it('returns error when fewer than 2 items', () => {
      const state = makeState({ items: [makeItem()] });
      expect(errorCodes(validateOrderingInteraction(state))).toContain(
        ValidationError.TOO_FEW_CHOICES,
      );
    });

    it('returns error when items list is empty', () => {
      const state = makeState({ items: [] });
      expect(errorCodes(validateOrderingInteraction(state))).toContain(
        ValidationError.TOO_FEW_CHOICES,
      );
    });

    it('does not return error with 2 or more items', () => {
      expect(errorCodes(validateOrderingInteraction(makeState()))).not.toContain(
        ValidationError.TOO_FEW_CHOICES,
      );
    });
  });

  describe('EMPTY_CHOICE_CONTENT', () => {
    it('returns error for each item with empty content', () => {
      const state = makeState({
        items: [makeItem({ id: 'a', content: '' }), makeItem({ id: 'b', content: '  ' })],
      });
      const errors = validateOrderingInteraction(state).filter(
        e => e.code === ValidationError.EMPTY_CHOICE_CONTENT,
      );
      expect(errors).toHaveLength(2);
      expect(errors.map(e => e.id)).toContain('a');
      expect(errors.map(e => e.id)).toContain('b');
    });

    it('does not flag items with content wrapped in HTML tags', () => {
      const state = makeState({
        items: [
          makeItem({ id: 'a', content: '<strong>Mercury</strong>' }),
          makeItem({ id: 'b', content: 'Venus' }),
        ],
      });
      expect(errorCodes(validateOrderingInteraction(state))).not.toContain(
        ValidationError.EMPTY_CHOICE_CONTENT,
      );
    });
  });

  describe('DUPLICATE_CHOICE_CONTENT', () => {
    it('flags all items with identical normalised text content', () => {
      const state = makeState({
        items: [
          makeItem({ id: 'a', content: 'Mercury' }),
          makeItem({ id: 'b', content: 'Mercury' }),
          makeItem({ id: 'c', content: ' Mercury ' }),
          makeItem({ id: 'd', content: '<p>Mercury</p>' }),
          makeItem({ id: 'e', content: 'Venus' }),
        ],
      });
      const errors = validateOrderingInteraction(state).filter(
        e => e.code === ValidationError.DUPLICATE_CHOICE_CONTENT,
      );
      const ids = errors.map(e => e.id);
      expect(ids).toContain('a');
      expect(ids).toContain('b');
      expect(ids).toContain('c');
      expect(ids).toContain('d');
      expect(ids).not.toContain('e');
    });

    it('does not return error for unique content', () => {
      expect(errorCodes(validateOrderingInteraction(makeState()))).not.toContain(
        ValidationError.DUPLICATE_CHOICE_CONTENT,
      );
    });
  });
});
