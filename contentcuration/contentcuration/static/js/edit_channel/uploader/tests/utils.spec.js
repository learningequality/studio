import each from 'jest-each';

import { AssessmentItemTypes } from '../constants';
import {
  getCorrectAnswersIndices,
  mapCorrectAnswers,
  updateAnswersToQuestionType,
  parseNode,
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

  describe('parseNode', () => {
    it('parses and sorts assessment items data', () => {
      const node = {
        assessment_items: [
          {
            order: 1,
            question: 'Question 2',
            answers: JSON.stringify([
              { answer: 'Question 2 - Answer 1', correct: true, order: 1 },
              { answer: 'Question 2 - Answer 2', correct: false, order: 2 },
            ]),
            hints: JSON.stringify([
              { hint: 'Question 1 - Hint 3', order: 3 },
              { hint: 'Question 1 - Hint 2', order: 2 },
              { hint: 'Question 1 - Hint 1', order: 1 },
            ]),
          },
          {
            order: 0,
            question: 'Question 1',
            answers: JSON.stringify([
              { answer: 'Question 1 - Answer 3', correct: false, order: 3 },
              { answer: 'Question 1 - Answer 1', correct: true, order: 1 },
              { answer: 'Question 1 - Answer 2', correct: false, order: 2 },
            ]),
            hints: JSON.stringify([
              { hint: 'Question 2 - Hint 2', order: 2 },
              { hint: 'Question 2 - Hint 1', order: 1 },
            ]),
          },
        ],
      };

      expect(parseNode(node)).toEqual({
        assessment_items: [
          {
            order: 0,
            question: 'Question 1',
            answers: [
              { answer: 'Question 1 - Answer 1', correct: true, order: 1 },
              { answer: 'Question 1 - Answer 2', correct: false, order: 2 },
              { answer: 'Question 1 - Answer 3', correct: false, order: 3 },
            ],
            hints: [
              { hint: 'Question 2 - Hint 1', order: 1 },
              { hint: 'Question 2 - Hint 2', order: 2 },
            ],
          },
          {
            order: 1,
            question: 'Question 2',
            answers: [
              { answer: 'Question 2 - Answer 1', correct: true, order: 1 },
              { answer: 'Question 2 - Answer 2', correct: false, order: 2 },
            ],
            hints: [
              { hint: 'Question 1 - Hint 1', order: 1 },
              { hint: 'Question 1 - Hint 2', order: 2 },
              { hint: 'Question 1 - Hint 3', order: 3 },
            ],
          },
        ],
      });
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
