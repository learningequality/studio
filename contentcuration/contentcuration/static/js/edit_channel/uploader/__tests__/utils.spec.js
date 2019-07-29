import each from 'jest-each';

import { AssessmentItemTypes, AssessmentItemValidationErrors } from '../constants';
import {
  getCorrectAnswersIndices,
  mapCorrectAnswers,
  updateAnswersToQuestionType,
  sanitizeAssessmentItemAnswers,
  sanitizeAssessmentItemHints,
  sanitizeAssessmentItem,
  validateAssessmentItem,
  updateAssessmentDraftOrder,
  isAssessmentDraftItemValid,
  sanitizeAssessmentDraft,
  validateAssessmentDraft,
  insertBefore,
  insertAfter,
  swapElements,
} from '../utils';

describe('utils', () => {
  describe('getCorrectAnswersIndices', () => {
    let questionKind;

    describe('for a single selection question', () => {
      beforeEach(() => {
        questionKind = AssessmentItemTypes.SINGLE_SELECTION;
      });

      it('returns null if there is no correct answer', () => {
        expect(
          getCorrectAnswersIndices(questionKind, [
            { answer: 'Answer 1', correct: false },
            { answer: 'Answer 2', correct: false },
          ])
        ).toBeNull();
      });

      it('returns a correct answer index', () => {
        expect(
          getCorrectAnswersIndices(questionKind, [
            { answer: 'Answer 1', correct: false },
            { answer: 'Answer 2', correct: true },
          ])
        ).toBe(1);
      });
    });

    describe('for a true/false question', () => {
      beforeEach(() => {
        questionKind = AssessmentItemTypes.TRUE_FALSE;
      });

      it('returns null if there is no correct answer', () => {
        expect(
          getCorrectAnswersIndices(questionKind, [
            { answer: 'True', correct: false },
            { answer: 'False', correct: false },
          ])
        ).toBeNull();
      });

      it('returns a correct answer index', () => {
        expect(
          getCorrectAnswersIndices(questionKind, [
            { answer: 'True', correct: false },
            { answer: 'False', correct: true },
          ])
        ).toBe(1);
      });
    });

    describe('for a multiple selection question', () => {
      beforeEach(() => {
        questionKind = AssessmentItemTypes.MULTIPLE_SELECTION;
      });

      it('returns an empty array if there is no correct answer', () => {
        expect(
          getCorrectAnswersIndices(questionKind, [
            { answer: 'Answer 1', correct: false },
            { answer: 'Answer 2', correct: false },
            { answer: 'Answer 3', correct: false },
          ])
        ).toEqual([]);
      });

      it('returns an array of correct answer indices', () => {
        expect(
          getCorrectAnswersIndices(questionKind, [
            { answer: 'Answer 1', correct: true },
            { answer: 'Answer 2', correct: false },
            { answer: 'Answer 3', correct: true },
          ])
        ).toEqual([0, 2]);
      });
    });

    describe('for an input question', () => {
      beforeEach(() => {
        questionKind = AssessmentItemTypes.INPUT_QUESTION;
      });

      it('returns an empty array if there is no correct answer', () => {
        expect(
          getCorrectAnswersIndices(questionKind, [
            { answer: 'Answer 1', correct: false },
            { answer: 'Answer 2', correct: false },
            { answer: 'Answer 3', correct: false },
          ])
        ).toEqual([]);
      });

      it('returns an array of correct answer indices', () => {
        expect(
          getCorrectAnswersIndices(questionKind, [
            { answer: 'Answer 1', correct: true },
            { answer: 'Answer 2', correct: true },
            { answer: 'Answer 3', correct: true },
          ])
        ).toEqual([0, 1, 2]);
      });
    });
  });

  describe('mapCorrectAnswers', () => {
    describe('for a single correct answer index', () => {
      it('returns updated answers', () => {
        expect(
          mapCorrectAnswers(
            [
              { answer: 'Answer 1', correct: true },
              { answer: 'Answer 2', correct: false },
              { answer: 'Answer 3', correct: true },
            ],
            1
          )
        ).toEqual([
          { answer: 'Answer 1', correct: false },
          { answer: 'Answer 2', correct: true },
          { answer: 'Answer 3', correct: false },
        ]);
      });
    });

    describe('for an array of correct answers indices', () => {
      it('returns updated answers', () => {
        expect(
          mapCorrectAnswers(
            [
              { answer: 'Answer 1', correct: true },
              { answer: 'Answer 2', correct: false },
              { answer: 'Answer 3', correct: true },
            ],
            [1, 2]
          )
        ).toEqual([
          { answer: 'Answer 1', correct: false },
          { answer: 'Answer 2', correct: true },
          { answer: 'Answer 3', correct: true },
        ]);
      });
    });
  });

  describe('updateAnswersToQuestionType', () => {
    let answers;

    describe('when converting originally empty answers to true/false', () => {
      it('returns true/false answers', () => {
        expect(updateAnswersToQuestionType(AssessmentItemTypes.TRUE_FALSE, [])).toEqual([
          { answer: 'True', correct: true, order: 1 },
          { answer: 'False', correct: false, order: 2 },
        ]);
      });
    });

    describe('for originally single selection answers', () => {
      beforeEach(() => {
        answers = [
          { answer: 'Mayonnaise (I mean you can, but...)', correct: false, order: 1 },
          { answer: 'Peanut butter', correct: true, order: 2 },
          { answer: 'Jelly', correct: false, order: 3 },
        ];
      });

      describe('conversion to single selection', () => {
        it('returns the same answers', () => {
          expect(
            updateAnswersToQuestionType(AssessmentItemTypes.SINGLE_SELECTION, answers)
          ).toEqual(answers);
        });
      });

      describe('conversion to multiple selection', () => {
        it('returns the same answers', () => {
          expect(
            updateAnswersToQuestionType(AssessmentItemTypes.MULTIPLE_SELECTION, answers)
          ).toEqual(answers);
        });
      });

      describe('conversion to input question', () => {
        it('makes all answers correct', () => {
          expect(updateAnswersToQuestionType(AssessmentItemTypes.INPUT_QUESTION, answers)).toEqual([
            { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
            { answer: 'Peanut butter', correct: true, order: 2 },
            { answer: 'Jelly', correct: true, order: 3 },
          ]);
        });
      });

      describe('conversion to true/false', () => {
        it('returns true/false answers only', () => {
          expect(updateAnswersToQuestionType(AssessmentItemTypes.TRUE_FALSE, answers)).toEqual([
            { answer: 'True', correct: true, order: 1 },
            { answer: 'False', correct: false, order: 2 },
          ]);
        });
      });
    });

    describe('for originally input question', () => {
      beforeEach(() => {
        answers = [
          { answer: '8', correct: true, order: 1 },
          { answer: '8.0', correct: true, order: 2 },
        ];
      });

      describe('conversion to input question', () => {
        it('returns the same answers', () => {
          expect(updateAnswersToQuestionType(AssessmentItemTypes.INPUT_QUESTION, answers)).toEqual(
            answers
          );
        });
      });

      describe('conversion to multiple selection', () => {
        it('returns the same answers', () => {
          expect(
            updateAnswersToQuestionType(AssessmentItemTypes.MULTIPLE_SELECTION, answers)
          ).toEqual(answers);
        });
      });

      describe('conversion to single selection', () => {
        it('keeps only first answer as correct', () => {
          expect(
            updateAnswersToQuestionType(AssessmentItemTypes.SINGLE_SELECTION, answers)
          ).toEqual([
            { answer: '8', correct: true, order: 1 },
            { answer: '8.0', correct: false, order: 2 },
          ]);
        });
      });

      describe('conversion to true/false', () => {
        it('returns true/false answers only', () => {
          expect(updateAnswersToQuestionType(AssessmentItemTypes.TRUE_FALSE, answers)).toEqual([
            { answer: 'True', correct: true, order: 1 },
            { answer: 'False', correct: false, order: 2 },
          ]);
        });
      });
    });

    describe('for originally true/false question', () => {
      beforeEach(() => {
        answers = [
          { answer: 'True', correct: false, order: 1 },
          { answer: 'False', correct: true, order: 2 },
        ];
      });

      describe('conversion to true/false question', () => {
        it('returns the same answers', () => {
          expect(
            updateAnswersToQuestionType(AssessmentItemTypes.SINGLE_SELECTION, answers)
          ).toEqual(answers);
        });
      });

      describe('conversion to multiple selection', () => {
        it('returns the same answers', () => {
          expect(
            updateAnswersToQuestionType(AssessmentItemTypes.MULTIPLE_SELECTION, answers)
          ).toEqual(answers);
        });
      });

      describe('conversion to single selection', () => {
        it('returns the same answers', () => {
          expect(
            updateAnswersToQuestionType(AssessmentItemTypes.SINGLE_SELECTION, answers)
          ).toEqual(answers);
        });
      });

      describe('conversion to input question', () => {
        it('makes all answers correct', () => {
          expect(updateAnswersToQuestionType(AssessmentItemTypes.INPUT_QUESTION, answers)).toEqual([
            { answer: 'True', correct: true, order: 1 },
            { answer: 'False', correct: true, order: 2 },
          ]);
        });
      });
    });

    describe('for originally multiple selection answers', () => {
      describe('conversion to multiple selection', () => {
        it('returns the same answers', () => {
          expect(
            updateAnswersToQuestionType(AssessmentItemTypes.SINGLE_SELECTION, answers)
          ).toEqual(answers);
        });
      });

      describe('conversion to single selection', () => {
        describe('if there are some correct answers', () => {
          beforeEach(() => {
            answers = [
              { answer: 'Mayonnaise (I mean you can, but...)', correct: false, order: 1 },
              { answer: 'Peanut butter', correct: true, order: 2 },
              { answer: 'Jelly', correct: true, order: 3 },
            ];
          });

          it('keeps only first correct answer', () => {
            expect(
              updateAnswersToQuestionType(AssessmentItemTypes.SINGLE_SELECTION, answers)
            ).toEqual([
              { answer: 'Mayonnaise (I mean you can, but...)', correct: false, order: 1 },
              { answer: 'Peanut butter', correct: true, order: 2 },
              { answer: 'Jelly', correct: false, order: 3 },
            ]);
          });
        });

        describe('if there is no correct answer', () => {
          beforeEach(() => {
            answers = [
              { answer: 'Mayonnaise (I mean you can, but...)', correct: false, order: 1 },
              { answer: 'Peanut butter', correct: false, order: 2 },
              { answer: 'Jelly', correct: false, order: 3 },
            ];
          });

          it('makes a first answer correct', () => {
            expect(
              updateAnswersToQuestionType(AssessmentItemTypes.SINGLE_SELECTION, answers)
            ).toEqual([
              { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
              { answer: 'Peanut butter', correct: false, order: 2 },
              { answer: 'Jelly', correct: false, order: 3 },
            ]);
          });
        });
      });

      describe('conversion to input question', () => {
        beforeEach(() => {
          answers = [
            { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
            { answer: 'Peanut butter', correct: false, order: 2 },
            { answer: 'Jelly', correct: true, order: 3 },
          ];
        });

        it('marks all answers to be correct', () => {
          expect(updateAnswersToQuestionType(AssessmentItemTypes.INPUT_QUESTION, answers)).toEqual([
            { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
            { answer: 'Peanut butter', correct: true, order: 2 },
            { answer: 'Jelly', correct: true, order: 3 },
          ]);
        });
      });

      describe('conversion to true/false', () => {
        beforeEach(() => {
          answers = [
            { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
            { answer: 'Peanut butter', correct: false, order: 2 },
            { answer: 'Jelly', correct: true, order: 3 },
          ];
        });

        it('returns true/false answers only', () => {
          expect(updateAnswersToQuestionType(AssessmentItemTypes.TRUE_FALSE, answers)).toEqual([
            { answer: 'True', correct: true, order: 1 },
            { answer: 'False', correct: false, order: 2 },
          ]);
        });
      });
    });
  });

  describe('sanitizeAssessmentItemAnswers', () => {
    it('trims answers', () => {
      const answers = [
        { answer: '', order: 1, correct: true },
        { answer: ' 3 ', order: 2, correct: false },
        { answer: '  ', order: 3, correct: true },
      ];

      expect(sanitizeAssessmentItemAnswers(answers)).toEqual([
        { answer: '', order: 1, correct: true },
        { answer: '3', order: 2, correct: false },
        { answer: '', order: 3, correct: true },
      ]);
    });

    it('removes all empty answers and reorders remaining answers if removeEmpty true', () => {
      const answers = [
        { answer: '', order: 1, correct: true },
        { answer: ' 3 ', order: 2, correct: false },
        { answer: '  ', order: 3, correct: true },
      ];

      expect(sanitizeAssessmentItemAnswers(answers, true)).toEqual([
        { answer: '3', order: 1, correct: false },
      ]);
    });
  });

  describe('sanitizeAssessmentItemHints', () => {
    it('trims hints', () => {
      const hints = [
        { hint: '', order: 1 },
        { hint: ' Hint 1 ', order: 2 },
        { hint: '  ', order: 3 },
      ];

      expect(sanitizeAssessmentItemHints(hints)).toEqual([
        { hint: '', order: 1 },
        { hint: 'Hint 1', order: 2 },
        { hint: '', order: 3 },
      ]);
    });

    it('removes all empty hints and reorders remaining hints if removeEmpty true', () => {
      const hints = [
        { hint: '', order: 1 },
        { hint: ' Hint 1 ', order: 2 },
        { hint: '  ', order: 3 },
      ];

      expect(sanitizeAssessmentItemHints(hints, true)).toEqual([{ hint: 'Hint 1', order: 1 }]);
    });
  });

  describe('sanitizeAssessmentItem', () => {
    it('trims question, hints and answers', () => {
      const assessmentItem = {
        order: 1,
        question: ' Question text ',
        answers: [
          { answer: ' Answer 1', order: 1, correct: false },
          { answer: '', order: 2, correct: true },
          { answer: 'Answer 3    ', order: 3, correct: true },
        ],
        hints: [{ hint: ' ', order: 1 }, { hint: '', order: 2 }, { hint: ' Hint 3', order: 3 }],
      };

      expect(sanitizeAssessmentItem(assessmentItem)).toEqual({
        order: 1,
        question: 'Question text',
        answers: [
          { answer: 'Answer 1', order: 1, correct: false },
          { answer: '', order: 2, correct: true },
          { answer: 'Answer 3', order: 3, correct: true },
        ],
        hints: [{ hint: '', order: 1 }, { hint: '', order: 2 }, { hint: 'Hint 3', order: 3 }],
      });
    });

    it('removes all empty hints and answers if removeEmpty true', () => {
      const assessmentItem = {
        order: 1,
        question: ' Question text ',
        answers: [
          { answer: ' Answer 1', order: 1, correct: false },
          { answer: '', order: 2, correct: true },
          { answer: 'Answer 3    ', order: 3, correct: true },
        ],
        hints: [{ hint: ' ', order: 1 }, { hint: '', order: 2 }, { hint: ' Hint 3', order: 3 }],
      };

      expect(sanitizeAssessmentItem(assessmentItem, true)).toEqual({
        order: 1,
        question: 'Question text',
        answers: [
          { answer: 'Answer 1', order: 1, correct: false },
          { answer: 'Answer 3', order: 2, correct: true },
        ],
        hints: [{ hint: 'Hint 3', order: 1 }],
      });
    });
  });

  describe('validateAssessmentItem', () => {
    describe('when question text is missing', () => {
      it('returns negative validation results', () => {
        const assessmentItem = {
          question: '',
          answers: [{ answer: 'Answer', correct: true, order: 1 }],
        };

        expect(validateAssessmentItem(assessmentItem)).toEqual({
          questionErrors: [AssessmentItemValidationErrors.BLANK_QUESTION],
          answersErrors: [],
        });
      });
    });

    describe('for single selection with no answers', () => {
      it('returns negative validation results', () => {
        const assessmentItem = {
          question: 'Question',
          type: AssessmentItemTypes.SINGLE_SELECTION,
          answers: [],
        };

        expect(validateAssessmentItem(assessmentItem)).toEqual({
          questionErrors: [],
          answersErrors: [AssessmentItemValidationErrors.INVALID_NUMBER_OF_CORRECT_ANSWERS],
        });
      });
    });

    describe('for single selection with no correct answer', () => {
      it('returns negative validation results', () => {
        const assessmentItem = {
          question: 'Question',
          type: AssessmentItemTypes.SINGLE_SELECTION,
          answers: [{ answer: 'Answer', correct: false, order: 1 }],
        };

        expect(validateAssessmentItem(assessmentItem)).toEqual({
          questionErrors: [],
          answersErrors: [AssessmentItemValidationErrors.INVALID_NUMBER_OF_CORRECT_ANSWERS],
        });
      });
    });

    describe('for single selection with more correct answers', () => {
      it('returns negative validation results', () => {
        const assessmentItem = {
          question: 'Question',
          type: AssessmentItemTypes.SINGLE_SELECTION,
          answers: [
            { answer: 'Answer 1', correct: true, order: 1 },
            { answer: 'Answer 2', correct: true, order: 2 },
          ],
        };

        expect(validateAssessmentItem(assessmentItem)).toEqual({
          questionErrors: [],
          answersErrors: [AssessmentItemValidationErrors.INVALID_NUMBER_OF_CORRECT_ANSWERS],
        });
      });
    });

    describe('for single selection with one correct answer', () => {
      it('returns positive validation results', () => {
        const assessmentItem = {
          question: 'Question',
          type: AssessmentItemTypes.SINGLE_SELECTION,
          answers: [
            { answer: 'Answer 1', correct: false, order: 1 },
            { answer: 'Answer 2', correct: true, order: 2 },
          ],
        };

        expect(validateAssessmentItem(assessmentItem)).toEqual({
          questionErrors: [],
          answersErrors: [],
        });
      });
    });

    describe('for multiple selection with no answers', () => {
      it('returns negative validation results', () => {
        const assessmentItem = {
          question: 'Question',
          type: AssessmentItemTypes.MULTIPLE_SELECTION,
          answers: [],
        };

        expect(validateAssessmentItem(assessmentItem)).toEqual({
          questionErrors: [],
          answersErrors: [AssessmentItemValidationErrors.INVALID_NUMBER_OF_CORRECT_ANSWERS],
        });
      });
    });

    describe('for multiple selection with no correct answer', () => {
      it('returns negative validation results', () => {
        const assessmentItem = {
          question: 'Question',
          type: AssessmentItemTypes.MULTIPLE_SELECTION,
          answers: [
            { answer: 'Answer 1', correct: false, order: 1 },
            { answer: 'Answer 2', correct: false, order: 2 },
          ],
        };

        expect(validateAssessmentItem(assessmentItem)).toEqual({
          questionErrors: [],
          answersErrors: [AssessmentItemValidationErrors.INVALID_NUMBER_OF_CORRECT_ANSWERS],
        });
      });
    });

    describe('for multiple selection with at least one correct answer', () => {
      it('returns positive validation results', () => {
        const assessmentItem = {
          question: 'Question',
          type: AssessmentItemTypes.MULTIPLE_SELECTION,
          answers: [
            { answer: 'Answer 1', correct: true, order: 1 },
            { answer: 'Answer 2', correct: false, order: 2 },
          ],
        };

        expect(validateAssessmentItem(assessmentItem)).toEqual({
          questionErrors: [],
          answersErrors: [],
        });
      });
    });

    describe('for input question with no answers', () => {
      it('returns negative validation results', () => {
        const assessmentItem = {
          question: 'Question',
          type: AssessmentItemTypes.INPUT_QUESTION,
          answers: [],
        };

        expect(validateAssessmentItem(assessmentItem)).toEqual({
          questionErrors: [],
          answersErrors: [AssessmentItemValidationErrors.INVALID_NUMBER_OF_CORRECT_ANSWERS],
        });
      });
    });

    describe('for input question with no correct answer', () => {
      it('returns negative validation results', () => {
        const assessmentItem = {
          question: 'Question',
          type: AssessmentItemTypes.INPUT_QUESTION,
          answers: [
            { answer: 'Answer 1', correct: false, order: 1 },
            { answer: 'Answer 2', correct: false, order: 2 },
          ],
        };

        expect(validateAssessmentItem(assessmentItem)).toEqual({
          questionErrors: [],
          answersErrors: [AssessmentItemValidationErrors.INVALID_NUMBER_OF_CORRECT_ANSWERS],
        });
      });
    });

    describe('for input question with at least one correct answer', () => {
      it('returns positive validation results', () => {
        const assessmentItem = {
          question: 'Question',
          type: AssessmentItemTypes.INPUT_QUESTION,
          answers: [
            { answer: 'Answer 1', correct: true, order: 1 },
            { answer: 'Answer 2', correct: true, order: 2 },
          ],
        };

        expect(validateAssessmentItem(assessmentItem)).toEqual({
          questionErrors: [],
          answersErrors: [],
        });
      });
    });

    describe('for true/false with no answers', () => {
      it('returns negative validation results', () => {
        const assessmentItem = {
          question: 'Question',
          type: AssessmentItemTypes.TRUE_FALSE,
          answers: [],
        };

        expect(validateAssessmentItem(assessmentItem)).toEqual({
          questionErrors: [],
          answersErrors: [AssessmentItemValidationErrors.INVALID_NUMBER_OF_CORRECT_ANSWERS],
        });
      });
    });

    describe('for true/false with no correct answer', () => {
      it('returns negative validation results', () => {
        const assessmentItem = {
          question: 'Question',
          type: AssessmentItemTypes.TRUE_FALSE,
          answers: [
            { answer: 'True', correct: false, order: 1 },
            { answer: 'False', correct: false, order: 2 },
          ],
        };

        expect(validateAssessmentItem(assessmentItem)).toEqual({
          questionErrors: [],
          answersErrors: [AssessmentItemValidationErrors.INVALID_NUMBER_OF_CORRECT_ANSWERS],
        });
      });
    });

    describe('for true/false with more correct answers', () => {
      it('returns negative validation results', () => {
        const assessmentItem = {
          question: 'Question',
          type: AssessmentItemTypes.TRUE_FALSE,
          answers: [
            { answer: 'True', correct: true, order: 1 },
            { answer: 'False', correct: true, order: 2 },
          ],
        };

        expect(validateAssessmentItem(assessmentItem)).toEqual({
          questionErrors: [],
          answersErrors: [AssessmentItemValidationErrors.INVALID_NUMBER_OF_CORRECT_ANSWERS],
        });
      });
    });

    describe('for true/false with one correct answer', () => {
      it('returns positive validation results', () => {
        const assessmentItem = {
          question: 'Question',
          type: AssessmentItemTypes.TRUE_FALSE,
          answers: [
            { answer: 'True', correct: false, order: 1 },
            { answer: 'False', correct: true, order: 2 },
          ],
        };

        expect(validateAssessmentItem(assessmentItem)).toEqual({
          questionErrors: [],
          answersErrors: [],
        });
      });
    });
  });

  describe('updateAssessmentDraftOrder', () => {
    it('updates `order` fields according to a position in an array', () => {
      const assessmentDraft = [
        {
          data: {
            order: 1,
            question: 'Question 1',
          },
          validation: {},
        },
        {
          data: {
            order: 0,
            question: 'Question 2',
          },
          validation: {},
        },
        {
          data: {
            order: 4,
            question: 'Question 2',
          },
          validation: {},
        },
      ];

      expect(updateAssessmentDraftOrder(assessmentDraft)).toEqual([
        {
          data: {
            order: 0,
            question: 'Question 1',
          },
          validation: {},
        },
        {
          data: {
            order: 1,
            question: 'Question 2',
          },
          validation: {},
        },
        {
          data: {
            order: 2,
            question: 'Question 2',
          },
          validation: {},
        },
      ]);
    });
  });

  describe('isAssessmentDraftItemValid', () => {
    it('returns true if an item has no validation errors', () => {
      const item = {
        data: {
          question: 'Question 1',
        },
        validation: {},
      };

      expect(isAssessmentDraftItemValid(item)).toBe(true);
    });

    const item = {
      data: {
        question: 'Question 1',
      },
      validation: {
        answersErrors: [AssessmentItemValidationErrors.INVALID_NUMBER_OF_CORRECT_ANSWERS],
        questionErrors: [],
      },
    };

    expect(isAssessmentDraftItemValid(item)).toBe(false);
  });

  describe('sanitizeAssessmentDraft', () => {
    it('sanitizes questions/answers/hints texts and removes empty questions/answers/hints', () => {
      const assessmentDraft = [
        {
          data: {
            order: 0,
            question: ' Question 1 text ',
            answers: [
              { answer: ' Answer 1', order: 1, correct: false },
              { answer: '', order: 2, correct: true },
              { answer: 'Answer 3 ', order: 3, correct: true },
            ],
            hints: [{ hint: ' ', order: 1 }, { hint: '', order: 2 }, { hint: ' Hint 3', order: 3 }],
          },
          validation: {},
        },
        {
          data: {
            order: 1,
            question: ' ',
            answers: [{ answer: '', order: 1, correct: true }],
            hints: [{ hint: ' ', order: 1 }, { hint: '', order: 2 }],
          },
          validation: {},
        },
        {
          data: {
            order: 2,
            question: '',
            answers: [],
            hints: [],
          },
          validation: {},
        },
        {
          data: {
            order: 3,
            question: ' Question 4 text ',
            answers: [{ answer: '', order: 2, correct: true }],
            hints: [],
          },
          validation: {},
        },
      ];

      expect(sanitizeAssessmentDraft(assessmentDraft)).toEqual([
        {
          data: {
            order: 0,
            question: 'Question 1 text',
            answers: [
              { answer: 'Answer 1', order: 1, correct: false },
              { answer: 'Answer 3', order: 2, correct: true },
            ],
            hints: [{ hint: 'Hint 3', order: 1 }],
          },
          validation: {},
        },
        {
          data: {
            order: 1,
            question: 'Question 4 text',
            answers: [],
            hints: [],
          },
          validation: {},
        },
      ]);
    });
  });

  describe('validateAssessmentDraft', () => {
    it('performs validation and saves results to `validation` field of each draft item', () => {
      const assessmentDraft = [
        {
          data: {
            order: 0,
            type: AssessmentItemTypes.SINGLE_SELECTION,
            question: 'Node 2 - Question 2',
            answers: [],
            hints: [],
          },
          validation: {},
        },
        {
          data: {
            order: 1,
            type: AssessmentItemTypes.SINGLE_SELECTION,
            question: '',
            answers: [{ answer: 'Answer 1', order: 1, correct: false }],
            hints: [],
          },
          validation: {},
        },
      ];

      expect(validateAssessmentDraft(assessmentDraft)).toEqual([
        {
          data: {
            order: 0,
            type: AssessmentItemTypes.SINGLE_SELECTION,
            question: 'Node 2 - Question 2',
            answers: [],
            hints: [],
          },
          validation: {
            questionErrors: [],
            answersErrors: [AssessmentItemValidationErrors.INVALID_NUMBER_OF_CORRECT_ANSWERS],
          },
        },
        {
          data: {
            order: 1,
            type: AssessmentItemTypes.SINGLE_SELECTION,
            question: '',
            answers: [{ answer: 'Answer 1', order: 1, correct: false }],
            hints: [],
          },
          validation: {
            questionErrors: [AssessmentItemValidationErrors.BLANK_QUESTION],
            answersErrors: [AssessmentItemValidationErrors.INVALID_NUMBER_OF_CORRECT_ANSWERS],
          },
        },
      ]);
    });
  });

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
});
