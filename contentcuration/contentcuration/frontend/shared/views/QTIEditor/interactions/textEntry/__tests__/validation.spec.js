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

    it('does not return PROMPT_REQUIRED when the prompt asks its question in a picture', () => {
      const errors = validateTextEntryInteraction(
        { ...VALID_NUMERIC_STATE, prompt: '<p><img src="abc123.png"/></p>' },
        QuestionType.NUMERIC,
      );
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

    describe('in a language', () => {
      const numericErrors = (values, language) =>
        validateTextEntryInteraction(
          {
            ...VALID_NUMERIC_STATE,
            answers: values.map((value, i) => ({ id: `a${i}`, value })),
          },
          QuestionType.NUMERIC,
          { language },
        );

      it('rejects a decimal comma with no language', () => {
        expect(numericErrors(['1,5'])).toEqual([
          { code: ValidationError.INVALID_NUMERIC_VALUE, id: 'a0' },
        ]);
      });

      it('compares answers by the number they read as', () => {
        expect(numericErrors(['1 234,5', '1234,50'], 'fr')).toEqual([
          { code: ValidationError.DUPLICATE_ANSWER_CONTENT, id: 'a0' },
          { code: ValidationError.DUPLICATE_ANSWER_CONTENT, id: 'a1' },
        ]);
      });
    });

    it('does not flag INVALID_NUMERIC_VALUE for freeResponse', () => {
      const errors = validateTextEntryInteraction(
        { ...VALID_FREE_STATE, answers: [{ id: 'a1', value: 'abc' }] },
        QuestionType.FREE_RESPONSE,
      );
      expect(errors.some(e => e.code === ValidationError.INVALID_NUMERIC_VALUE)).toBe(false);
    });
  });

  const duplicateIds = (values, questionType = QuestionType.NUMERIC) =>
    validateTextEntryInteraction(
      {
        ...VALID_NUMERIC_STATE,
        answers: values.map((value, i) => ({ id: `a${i}`, value, caseSensitive: false })),
      },
      questionType,
    )
      .filter(e => e.code === ValidationError.DUPLICATE_ANSWER_CONTENT)
      .map(e => e.id);

  describe('DUPLICATE_ANSWER_CONTENT (numeric)', () => {
    it('flags 1e-5 and 0.00001 as duplicates', () => {
      expect(duplicateIds(['1e-5', '0.00001'])).toEqual(['a0', 'a1']);
    });

    it('flags every answer equal in value to another', () => {
      expect(duplicateIds(['5', '21', '5.0', '+5'])).toEqual(['a0', 'a2', 'a3']);
    });

    it('does not flag 21 and 21.5 as duplicates', () => {
      expect(duplicateIds(['21', '21.5'])).toEqual([]);
    });
  });

  describe('DUPLICATE_ANSWER_CONTENT (textEntry)', () => {
    it('flags every case-insensitive answer equal to another', () => {
      expect(duplicateIds(['Paris', 'Rome', 'paris'], QuestionType.TEXT_ENTRY)).toEqual([
        'a0',
        'a2',
      ]);
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
