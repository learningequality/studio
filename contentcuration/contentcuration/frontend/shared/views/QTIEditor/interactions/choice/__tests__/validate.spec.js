import { choiceInteractionDescriptor } from '../ChoiceInteractionDescriptor';

import { ValidationError, QuestionType, Orientation } from '../../../constants';

const validate = choiceInteractionDescriptor.validate.bind(choiceInteractionDescriptor);

// Helpers

function makeAnswer(overrides = {}) {
  return { id: 'choice_a', content: 'Option A', correct: false, fixed: false, ...overrides };
}

function makeState(overrides = {}) {
  return {
    prompt: 'What is 2 + 2?',
    choices: [
      makeAnswer({ id: 'choice_a', content: 'Four', correct: true }),
      makeAnswer({ id: 'choice_b', content: 'Five', correct: false }),
    ],
    maxChoices: 1,
    minChoices: 0,
    shuffle: false,
    orientation: Orientation.VERTICAL,
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
      choices: [
        makeAnswer({ id: 'a', content: 'Option A', correct: true }),
        makeAnswer({ id: 'b', content: 'Option B', correct: true }),
      ],
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

  describe('DUPLICATE_CHOICE_CONTENT', () => {
    it('returns an error for each choice that has identical text content', () => {
      const state = makeState({
        choices: [
          makeAnswer({ id: 'a', content: 'Yes', correct: true }),
          makeAnswer({ id: 'b', content: 'Yes', correct: false }),
          makeAnswer({ id: 'c', content: ' Yes ', correct: false }), // Whitespace is ignored
          makeAnswer({ id: 'd', content: '<p>Yes</p>', correct: false }), // HTML is stripped
          makeAnswer({ id: 'e', content: 'No', correct: false }),
        ],
      });
      const errors = validate(state, QuestionType.SINGLE_SELECT);
      const duplicateErrors = errors.filter(
        e => e.code === ValidationError.DUPLICATE_CHOICE_CONTENT,
      );

      expect(duplicateErrors).toHaveLength(4);
      const errorIds = duplicateErrors.map(e => e.id);
      expect(errorIds).toContain('a');
      expect(errorIds).toContain('b');
      expect(errorIds).toContain('c');
      expect(errorIds).toContain('d');
      expect(errorIds).not.toContain('e');
    });

    it('does not return error when choices have unique text content', () => {
      const state = makeState({
        choices: [
          makeAnswer({ id: 'a', content: 'Yes', correct: true }),
          makeAnswer({ id: 'b', content: 'No', correct: false }),
        ],
      });
      expect(errorCodes(validate(state, QuestionType.SINGLE_SELECT))).not.toContain(
        ValidationError.DUPLICATE_CHOICE_CONTENT,
      );
    });
  });

  describe('EMPTY_CHOICE_CONTENT', () => {
    it('returns an error for each choice with empty content', () => {
      const state = makeState({
        choices: [
          makeAnswer({ id: 'a', content: '', correct: true }),
          makeAnswer({ id: 'b', content: '  ', correct: false }),
        ],
      });
      const errors = validate(state, QuestionType.SINGLE_SELECT);
      const contentErrors = errors.filter(e => e.code === ValidationError.EMPTY_CHOICE_CONTENT);
      expect(contentErrors).toHaveLength(2);
      expect(contentErrors.map(e => e.id)).toEqual(['a', 'b']);
    });

    it('does not flag choices with content wrapped in HTML tags', () => {
      const state = makeState({
        choices: [
          makeAnswer({ id: 'a', content: '<strong>Yes</strong>', correct: true }),
          makeAnswer({ id: 'b', content: 'No', correct: false }),
        ],
      });
      const errors = validate(state, QuestionType.SINGLE_SELECT);
      expect(errorCodes(errors)).not.toContain(ValidationError.EMPTY_CHOICE_CONTENT);
    });
  });

  describe('NO_CORRECT_ANSWER', () => {
    it('returns error for singleSelect when no choice is correct', () => {
      const state = makeState({
        choices: [makeAnswer({ id: 'a', correct: false }), makeAnswer({ id: 'b', correct: false })],
      });
      expect(errorCodes(validate(state, QuestionType.SINGLE_SELECT))).toContain(
        ValidationError.NO_CORRECT_ANSWER,
      );
    });

    it('returns error for multiSelect when no choice is correct', () => {
      const state = makeState({
        choices: [makeAnswer({ id: 'a', correct: false }), makeAnswer({ id: 'b', correct: false })],
      });
      expect(errorCodes(validate(state, QuestionType.MULTI_SELECT))).toContain(
        ValidationError.NO_CORRECT_ANSWER,
      );
    });
  });

  describe('TOO_MANY_CORRECT_ANSWERS', () => {
    it('returns error for singleSelect when more than one choice is correct', () => {
      const state = makeState({
        choices: [makeAnswer({ id: 'a', correct: true }), makeAnswer({ id: 'b', correct: true })],
      });
      expect(errorCodes(validate(state, QuestionType.SINGLE_SELECT))).toContain(
        ValidationError.TOO_MANY_CORRECT_ANSWERS,
      );
    });

    it('does not return error for multiSelect when more than one choice is correct', () => {
      const state = makeState({
        choices: [makeAnswer({ id: 'a', correct: true }), makeAnswer({ id: 'b', correct: true })],
      });
      expect(errorCodes(validate(state, QuestionType.MULTI_SELECT))).not.toContain(
        ValidationError.TOO_MANY_CORRECT_ANSWERS,
      );
    });
  });
});
