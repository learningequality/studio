import { AssessmentItemTypes, AssessmentItemValidationErrors } from '../../constants';
import {
  nodeAssessmentItemsCount,
  nodeAssessmentDraft,
  isNodeAssessmentDraftValid,
  invalidNodeAssessmentDraftItemsCount,
} from '../getters';

describe('edit_modal', () => {
  let state;

  describe('getters', () => {
    describe('nodeAssessmentItemsCount', () => {
      describe('when there is no draft for a node', () => {
        beforeEach(() => {
          state = {
            nodes: [
              {
                title: 'Exercise 1',
                id: 'exercise-1',
                assessment_items: [
                  {
                    id: 0,
                    question: 'Exercise 1 - Question 1',
                    type: AssessmentItemTypes.SINGLE_SELECTION,
                    order: 0,
                    answers: JSON.stringify([
                      { answer: 'Blue', correct: false, order: 1 },
                      { answer: 'Yellow', correct: true, order: 2 },
                    ]),
                    hints: JSON.stringify([{ hint: 'Not red', order: 1 }]),
                  },
                ],
              },
              {
                title: 'Exercise 2',
                id: 'exercise-2',
                assessment_items: [
                  {
                    id: 1,
                    question: 'Exercise 2 - Question 2',
                    type: AssessmentItemTypes.SINGLE_SELECTION,
                    order: 1,
                    answers: JSON.stringify([
                      { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
                      { answer: 'Peanut butter', correct: false, order: 2 },
                    ]),
                    hints: JSON.stringify([
                      { hint: "It's not healthy", order: 1 },
                      { hint: 'Tasty!', order: 2 },
                    ]),
                  },
                  {
                    id: 2,
                    question: 'Exercise 2 - Question 3',
                    type: AssessmentItemTypes.MULTIPLE_SELECTION,
                    order: 2,
                    answers: JSON.stringify([
                      { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
                      { answer: 'Peanut butter', correct: false, order: 2 },
                      { answer: 'Jelly', correct: true, order: 3 },
                    ]),
                  },
                ],
              },
            ],
            nodesAssessmentDrafts: {},
          };
        });

        it('takes number of assessment items from nodes retrieved from API', () => {
          expect(nodeAssessmentItemsCount(state)('exercise-2')).toBe(2);
        });
      });

      describe('when there is a draft for a node', () => {
        beforeEach(() => {
          state = {
            nodes: [
              {
                title: 'Exercise 1',
                id: 'exercise-1',
                assessment_items: [
                  {
                    id: 0,
                    question: 'Exercise 1 - Question 1',
                    type: AssessmentItemTypes.SINGLE_SELECTION,
                    order: 0,
                    answers: JSON.stringify([
                      { answer: 'Blue', correct: false, order: 1 },
                      { answer: 'Yellow', correct: true, order: 2 },
                    ]),
                    hints: JSON.stringify([{ hint: 'Not red', order: 1 }]),
                  },
                ],
              },
              {
                title: 'Exercise 2',
                id: 'exercise-2',
                assessment_items: [
                  {
                    id: 1,
                    question: 'Exercise 2 - Question 2',
                    type: AssessmentItemTypes.SINGLE_SELECTION,
                    order: 1,
                    answers: JSON.stringify([
                      { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
                      { answer: 'Peanut butter', correct: false, order: 2 },
                    ]),
                    hints: JSON.stringify([
                      { hint: "It's not healthy", order: 1 },
                      { hint: 'Tasty!', order: 2 },
                    ]),
                  },
                  {
                    id: 2,
                    question: 'Exercise 2 - Question 3',
                    type: AssessmentItemTypes.MULTIPLE_SELECTION,
                    order: 2,
                    answers: JSON.stringify([
                      { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
                      { answer: 'Peanut butter', correct: false, order: 2 },
                      { answer: 'Jelly', correct: true, order: 3 },
                    ]),
                  },
                ],
              },
            ],
            nodesAssessmentDrafts: {
              'exercise-2': [
                {
                  data: {
                    id: 1,
                    question: 'Exercise 2 - Question 2',
                    type: AssessmentItemTypes.SINGLE_SELECTION,
                    order: 1,
                    answers: [
                      { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
                      { answer: 'Peanut butter', correct: false, order: 2 },
                    ],
                    hints: [{ hint: "It's not healthy", order: 1 }, { hint: 'Tasty!', order: 2 }],
                  },
                  validation: {},
                },
                {
                  data: {
                    id: 2,
                    question: 'Exercise 2 - Question 3',
                    type: AssessmentItemTypes.MULTIPLE_SELECTION,
                    order: 2,
                    answers: [
                      { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
                      { answer: 'Peanut butter', correct: false, order: 2 },
                      { answer: 'Jelly', correct: true, order: 3 },
                    ],
                  },
                  validation: {},
                },
                {
                  data: {
                    question: 'New question!',
                    answers: [{ answer: 'Answert', correct: true, order: 1 }],
                  },
                  validation: {},
                },
              ],
            },
          };
        });

        it('takes number of assessment items from the draft', () => {
          expect(nodeAssessmentItemsCount(state)('exercise-2')).toBe(3);
        });
      });
    });

    describe('nodeAssessmentDraft', () => {
      beforeEach(() => {
        state = {
          nodesAssessmentDrafts: {
            'node-1': [
              {
                data: {
                  id: 1,
                  order: 0,
                  question: 'Node 1 - Question 1',
                },
                validation: {},
              },
            ],
            'node-2': [
              {
                data: {
                  id: 2,
                  order: 0,
                  question: 'Node 2 - Question 1',
                },
                validation: {},
              },
              {
                data: {
                  id: 3,
                  order: 1,
                  question: 'Node 2 - Question 2',
                },
                validation: {},
              },
            ],
          },
        };
      });

      it('returns null when an assessment draft not available for a given node ID', () => {
        expect(nodeAssessmentDraft(state)('node-3')).toBeNull();
      });

      it('returns an assessment draft belonging to a given node ID', () => {
        expect(nodeAssessmentDraft(state)('node-2')).toEqual([
          {
            data: {
              id: 2,
              order: 0,
              question: 'Node 2 - Question 1',
            },
            validation: {},
          },
          {
            data: {
              id: 3,
              order: 1,
              question: 'Node 2 - Question 2',
            },
            validation: {},
          },
        ]);
      });
    });

    describe('isNodeAssessmentDraftValid', () => {
      beforeEach(() => {
        state = {
          nodesAssessmentDrafts: {
            'node-1': [
              {
                data: {
                  type: AssessmentItemTypes.SINGLE_SELECTION,
                  order: 0,
                  question: 'Node 1 - Question 1',
                  answers: [{ answer: 'Answer 1', order: 1, correct: true }],
                },
                validation: {},
              },
              {
                data: {
                  type: AssessmentItemTypes.SINGLE_SELECTION,
                  order: 1,
                  question: 'Node 1 - Question 2',
                  answers: [{ answer: 'Answer 1', order: 1, correct: true }],
                },
                validation: {},
              },
            ],
            'node-2': [
              {
                data: {
                  type: AssessmentItemTypes.SINGLE_SELECTION,
                  order: 0,
                  question: '',
                  answers: [{ answer: 'Answer 1', order: 1, correct: true }],
                },
                validation: {
                  questionErrors: [AssessmentItemValidationErrors.BLANK_QUESTION],
                },
              },
              {
                data: {
                  type: AssessmentItemTypes.SINGLE_SELECTION,
                  order: 1,
                  question: 'Node 1 - Question 2',
                  answers: [{ answer: 'Answer 1', order: 1, correct: true }],
                },
                validation: {},
              },
            ],
            'node-3': [
              {
                data: {
                  type: AssessmentItemTypes.SINGLE_SELECTION,
                  order: 0,
                  question: '',
                  answers: [{ answer: 'Answer 1', order: 1, correct: false }],
                },
                validation: {
                  answersErrors: [AssessmentItemValidationErrors.INVALID_NUMBER_OF_CORRECT_ANSWERS],
                },
              },
              {
                data: {
                  type: AssessmentItemTypes.SINGLE_SELECTION,
                  order: 1,
                  question: 'Node 1 - Question 2',
                  answers: [{ answer: 'Answer 1', order: 1, correct: true }],
                },
                validation: {},
              },
            ],
          },
        };
      });

      it('returns true if all items of a correct node assessment draft are valid', () => {
        expect(isNodeAssessmentDraftValid(state)('node-1')).toBe(true);
      });

      it('returns false if at least one item of correct node assessment draft is invalid', () => {
        expect(isNodeAssessmentDraftValid(state)('node-2')).toBe(false);
        expect(isNodeAssessmentDraftValid(state)('node-3')).toBe(false);
      });
    });

    describe('invalidNodeAssessmentDraftItemsCount', () => {
      beforeEach(() => {
        state = {
          nodesAssessmentDrafts: {
            'node-1': [
              {
                data: {
                  type: AssessmentItemTypes.SINGLE_SELECTION,
                  order: 0,
                  question: 'Question',
                  answers: [{ answer: 'Answer 1', order: 1, correct: false }],
                },
                validation: {
                  answersErrors: [AssessmentItemValidationErrors.INVALID_NUMBER_OF_CORRECT_ANSWERS],
                },
              },
              {
                data: {
                  type: AssessmentItemTypes.SINGLE_SELECTION,
                  order: 1,
                  question: '',
                  answers: [{ answer: 'Answer 1', order: 1, correct: false }],
                },
                validation: {
                  questionErrors: [AssessmentItemValidationErrors.BLANK_QUESTION],
                  answersErrors: [AssessmentItemValidationErrors.INVALID_NUMBER_OF_CORRECT_ANSWERS],
                },
              },
            ],
            'node-2': [
              {
                data: {
                  type: AssessmentItemTypes.SINGLE_SELECTION,
                  order: 0,
                  question: 'Question',
                  answers: [{ answer: 'Answer 1', order: 1, correct: true }],
                },
                validation: {},
              },
              {
                data: {
                  type: AssessmentItemTypes.SINGLE_SELECTION,
                  order: 1,
                  question: 'Question',
                  answers: [{ answer: 'Answer 1', order: 1, correct: true }],
                },
                validation: {},
              },
            ],
            'node-3': [
              {
                data: {
                  type: AssessmentItemTypes.SINGLE_SELECTION,
                  order: 0,
                  question: '',
                  answers: [{ answer: 'Answer 1', order: 1, correct: true }],
                },
                validation: {
                  questionErrors: [AssessmentItemValidationErrors.BLANK_QUESTION],
                },
              },
              {
                data: {
                  type: AssessmentItemTypes.SINGLE_SELECTION,
                  order: 1,
                  question: 'Question',
                  answers: [{ answer: 'Answer 1', order: 1, correct: true }],
                },
                validation: {},
              },
            ],
          },
        };
      });

      it("returns 0 if a node assessment doesn't contain any invalid items", () => {
        expect(invalidNodeAssessmentDraftItemsCount(state)('node-2')).toBe(0);
      });

      it('returns a correct number of invalid items if a node assessment contains some', () => {
        expect(invalidNodeAssessmentDraftItemsCount(state)('node-1')).toBe(2);
        expect(invalidNodeAssessmentDraftItemsCount(state)('node-3')).toBe(1);
      });
    });
  });
});
