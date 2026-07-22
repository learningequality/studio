import { validateTextEntryInteraction } from '../validation';
import { QuestionType, ValidationError } from '../../../constants';

const VALID_NUMERIC_STATE = {
  prompt: '<p>What is 3 × 4?</p>',
  answers: [{ id: 'a1', value: '12' }],
  expectedLength: 0,
};

const VALID_FREE_STATE = {
  prompt: '<p>Describe photosynthesis.</p>',
  answers: [],
  expectedLength: 50,
};

describe('validateTextEntryInteraction', () => {
  describe('PROMPT_REQUIRED', () => {
    it('returns PROMPT_REQUIRED when prompt is empty', () => {
      const errors = validateTextEntryInteraction(
        { ...VALID_NUMERIC_STATE, prompt: '' },
        QuestionType.NUMERIC,
      );
      expect(errors.some(e => e.code === ValidationError.PROMPT_REQUIRED)).toBe(true);
    });

    it('returns PROMPT_REQUIRED when prompt is whitespace-only', () => {
      const errors = validateTextEntryInteraction(
        { ...VALID_NUMERIC_STATE, prompt: '   ' },
        QuestionType.NUMERIC,
      );
      expect(errors.some(e => e.code === ValidationError.PROMPT_REQUIRED)).toBe(true);
    });

    it('returns PROMPT_REQUIRED when prompt contains only HTML tags with no text', () => {
      const errors = validateTextEntryInteraction(
        { ...VALID_NUMERIC_STATE, prompt: '<p></p>' },
        QuestionType.NUMERIC,
      );
      expect(errors.some(e => e.code === ValidationError.PROMPT_REQUIRED)).toBe(true);
    });

    it('returns PROMPT_REQUIRED for a visually-empty &nbsp;-only prompt (entity regression)', () => {
      // The naive /<[^>]*>/g regex leaves the literal text "&nbsp;" which is truthy,
      // so PROMPT_REQUIRED would silently pass. QTISanitizer.stripTags parses via
      // DOMParser text/html, which decodes entities and returns actual whitespace.
      const errors = validateTextEntryInteraction(
        { ...VALID_NUMERIC_STATE, prompt: '<p>&nbsp;</p>' },
        QuestionType.NUMERIC,
      );
      expect(errors.some(e => e.code === ValidationError.PROMPT_REQUIRED)).toBe(true);
    });

    it('does not return PROMPT_REQUIRED when prompt has text content', () => {
      const errors = validateTextEntryInteraction(VALID_NUMERIC_STATE, QuestionType.NUMERIC);
      expect(errors.some(e => e.code === ValidationError.PROMPT_REQUIRED)).toBe(false);
    });
  });

  describe('TEXT_ENTRY constraints', () => {
    it('returns NO_CORRECT_ANSWER for textEntry with 0 answers', () => {
      const errors = validateTextEntryInteraction(
        { ...VALID_NUMERIC_STATE, answers: [] },
        QuestionType.TEXT_ENTRY,
      );
      expect(errors.some(e => e.code === ValidationError.NO_CORRECT_ANSWER)).toBe(true);
    });

    it('returns EMPTY_ANSWER_CONTENT for textEntry with empty answers', () => {
      const errors = validateTextEntryInteraction(
        { ...VALID_NUMERIC_STATE, answers: [{ id: 'a1', value: '   ' }] },
        QuestionType.TEXT_ENTRY,
      );
      expect(errors.some(e => e.code === ValidationError.EMPTY_ANSWER_CONTENT)).toBe(true);
    });
  });

  describe('NO_CORRECT_ANSWER (numeric only)', () => {
    it('returns NO_CORRECT_ANSWER for numeric with 0 answers', () => {
      const errors = validateTextEntryInteraction(
        { ...VALID_NUMERIC_STATE, answers: [] },
        QuestionType.NUMERIC,
      );
      expect(errors.some(e => e.code === ValidationError.NO_CORRECT_ANSWER)).toBe(true);
    });

    it('does not return NO_CORRECT_ANSWER for numeric with at least 1 answer', () => {
      const errors = validateTextEntryInteraction(VALID_NUMERIC_STATE, QuestionType.NUMERIC);
      expect(errors.some(e => e.code === ValidationError.NO_CORRECT_ANSWER)).toBe(false);
    });

    it('does not return NO_CORRECT_ANSWER for freeResponse with 0 answers', () => {
      const errors = validateTextEntryInteraction(VALID_FREE_STATE, QuestionType.FREE_RESPONSE);
      expect(errors.some(e => e.code === ValidationError.NO_CORRECT_ANSWER)).toBe(false);
    });
  });

  describe('INVALID_NUMERIC_VALUE', () => {
    it.each([
      ['integer', '12'],
      ['negative integer', '-3'],
      ['decimal', '0.5'],
      ['scientific notation', '1.5e2'],
    ])('does not flag a valid %s value (%s)', (_, value) => {
      const errors = validateTextEntryInteraction(
        { ...VALID_NUMERIC_STATE, answers: [{ id: 'a1', value }] },
        QuestionType.NUMERIC,
      );
      expect(errors.some(e => e.code === ValidationError.INVALID_NUMERIC_VALUE)).toBe(false);
    });

    it.each([
      ['letters', 'abc'],
      ['expression', '1+2'],
      ['fraction', '1/2'],
      ['empty string', ''],
    ])('flags an invalid value: %s', (_, value) => {
      const errors = validateTextEntryInteraction(
        { ...VALID_NUMERIC_STATE, answers: [{ id: 'a1', value }] },
        QuestionType.NUMERIC,
      );
      expect(errors.some(e => e.code === ValidationError.INVALID_NUMERIC_VALUE)).toBe(true);
    });

    it('attaches the answer id to the error', () => {
      const errors = validateTextEntryInteraction(
        { ...VALID_NUMERIC_STATE, answers: [{ id: 'answer_abc', value: 'bad' }] },
        QuestionType.NUMERIC,
      );
      const err = errors.find(e => e.code === ValidationError.INVALID_NUMERIC_VALUE);
      expect(err?.id).toBe('answer_abc');
    });

    it('emits one INVALID_NUMERIC_VALUE error per invalid answer', () => {
      const errors = validateTextEntryInteraction(
        {
          ...VALID_NUMERIC_STATE,
          answers: [
            { id: 'a1', value: 'bad' },
            { id: 'a2', value: 'also bad' },
          ],
        },
        QuestionType.NUMERIC,
      );
      const invalids = errors.filter(e => e.code === ValidationError.INVALID_NUMERIC_VALUE);
      expect(invalids).toHaveLength(2);
      expect(invalids.map(e => e.id)).toEqual(['a1', 'a2']);
    });

    it('does not flag INVALID_NUMERIC_VALUE for freeResponse', () => {
      // freeResponse state with a clearly non-numeric "answer" — should not error
      // (answers is always [] for freeResponse, but just in case)
      const errors = validateTextEntryInteraction(
        { ...VALID_FREE_STATE, answers: [{ id: 'a1', value: 'abc' }] },
        QuestionType.FREE_RESPONSE,
      );
      expect(errors.some(e => e.code === ValidationError.INVALID_NUMERIC_VALUE)).toBe(false);
    });
  });

  describe('valid states return empty array', () => {
    it('returns [] for a valid numeric state', () => {
      expect(validateTextEntryInteraction(VALID_NUMERIC_STATE, QuestionType.NUMERIC)).toEqual([]);
    });

    it('returns [] for a valid freeResponse state', () => {
      expect(validateTextEntryInteraction(VALID_FREE_STATE, QuestionType.FREE_RESPONSE)).toEqual(
        [],
      );
    });
  });
});
