import { choiceInteractionDescriptor } from '../ChoiceInteractionDescriptor';

import { ValidationError, QuestionType } from '../../../constants';

const validate = choiceInteractionDescriptor.validate.bind(choiceInteractionDescriptor);

// Helpers

function makeAnswer(overrides = {}) {
  return { id: 'choice_a', content: 'Option A', correct: false, fixed: false, ...overrides };
}

function makeState(overrides = {}) {
  return {
    prompt: 'What is 2 + 2?',
    answers: [
      makeAnswer({ id: 'choice_a', content: 'Four', correct: true }),
      makeAnswer({ id: 'choice_b', content: 'Five', correct: false }),
    ],
    maxChoices: 1,
    minChoices: 0,
    shuffle: false,
    orientation: 'vertical',
    ...overrides,
  };
}

const errorCodes = errors => errors.map(e => e.code);

describe('validate()', () => {
  it('returns an empty array for a valid single-select state', () => {
    expect(validate(makeState(), QuestionType.SINGLE_SELECT)).toEqual([]);
  });

  it('returns an empty array for a valid multi-select state', () => {
    const state = makeState({
      answers: [makeAnswer({ id: 'a', correct: true }), makeAnswer({ id: 'b', correct: true })],
    });
    expect(validate(state, QuestionType.MULTI_SELECT)).toEqual([]);
  });

  describe('PROMPT_REQUIRED', () => {
    it('returns error when prompt is an empty string', () => {
      expect(errorCodes(validate(makeState({ prompt: '' }), QuestionType.SINGLE_SELECT))).toContain(
        ValidationError.PROMPT_REQUIRED,
      );
    });

    it('returns error when prompt is whitespace only', () => {
      expect(
        errorCodes(validate(makeState({ prompt: '   ' }), QuestionType.SINGLE_SELECT)),
      ).toContain(ValidationError.PROMPT_REQUIRED);
    });

    it('returns error when prompt is tags-only with no visible text', () => {
      expect(
        errorCodes(validate(makeState({ prompt: '<p> </p>' }), QuestionType.SINGLE_SELECT)),
      ).toContain(ValidationError.PROMPT_REQUIRED);
    });

    it('does not return error when prompt has visible text inside tags', () => {
      expect(
        errorCodes(validate(makeState({ prompt: '<p>Hello</p>' }), QuestionType.SINGLE_SELECT)),
      ).not.toContain(ValidationError.PROMPT_REQUIRED);
    });
  });

  describe('TOO_FEW_CHOICES', () => {
    it('returns error when there is only one answer', () => {
      const state = makeState({ answers: [makeAnswer({ correct: true })] });
      expect(errorCodes(validate(state, QuestionType.SINGLE_SELECT))).toContain(
        ValidationError.TOO_FEW_CHOICES,
      );
    });

    it('does not return error when there are two or more answers', () => {
      expect(errorCodes(validate(makeState(), QuestionType.SINGLE_SELECT))).not.toContain(
        ValidationError.TOO_FEW_CHOICES,
      );
    });
  });

  describe('EMPTY_CHOICE_CONTENT', () => {
    it('returns an error for each answer with empty content', () => {
      const state = makeState({
        answers: [
          makeAnswer({ id: 'a', content: '', correct: true }),
          makeAnswer({ id: 'b', content: '  ', correct: false }),
        ],
      });
      const errors = validate(state, QuestionType.SINGLE_SELECT);
      const contentErrors = errors.filter(e => e.code === ValidationError.EMPTY_CHOICE_CONTENT);
      expect(contentErrors).toHaveLength(2);
      expect(contentErrors.map(e => e.id)).toEqual(['a', 'b']);
    });

    it('does not flag answers with content wrapped in HTML tags', () => {
      const state = makeState({
        answers: [
          makeAnswer({ id: 'a', content: '<strong>Yes</strong>', correct: true }),
          makeAnswer({ id: 'b', content: 'No', correct: false }),
        ],
      });
      const errors = validate(state, QuestionType.SINGLE_SELECT);
      expect(errorCodes(errors)).not.toContain(ValidationError.EMPTY_CHOICE_CONTENT);
    });
  });

  describe('NO_CORRECT_ANSWER', () => {
    it('returns error for singleSelect when no answer is correct', () => {
      const state = makeState({
        answers: [makeAnswer({ id: 'a', correct: false }), makeAnswer({ id: 'b', correct: false })],
      });
      expect(errorCodes(validate(state, QuestionType.SINGLE_SELECT))).toContain(
        ValidationError.NO_CORRECT_ANSWER,
      );
    });

    it('returns error for multiSelect when no answer is correct', () => {
      const state = makeState({
        answers: [makeAnswer({ id: 'a', correct: false }), makeAnswer({ id: 'b', correct: false })],
      });
      expect(errorCodes(validate(state, QuestionType.MULTI_SELECT))).toContain(
        ValidationError.NO_CORRECT_ANSWER,
      );
    });
  });

  describe('TOO_MANY_CORRECT_ANSWERS', () => {
    it('returns error for singleSelect when more than one answer is correct', () => {
      const state = makeState({
        answers: [makeAnswer({ id: 'a', correct: true }), makeAnswer({ id: 'b', correct: true })],
      });
      expect(errorCodes(validate(state, QuestionType.SINGLE_SELECT))).toContain(
        ValidationError.TOO_MANY_CORRECT_ANSWERS,
      );
    });

    it('does not return error for multiSelect when more than one answer is correct', () => {
      const state = makeState({
        answers: [makeAnswer({ id: 'a', correct: true }), makeAnswer({ id: 'b', correct: true })],
      });
      expect(errorCodes(validate(state, QuestionType.MULTI_SELECT))).not.toContain(
        ValidationError.TOO_MANY_CORRECT_ANSWERS,
      );
    });
  });
});
