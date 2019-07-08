import { AssessmentItemTypes, AssessmentItemValidationErrors } from '../../constants';

var mutations = require('../mutations');

describe('edit_modal', () => {
  let state;

  describe('mutations', () => {
    describe('addNodeAssessmentDraft', () => {
      let assessmentItems;

      beforeEach(() => {
        state = {
          nodesAssessmentDrafts: {},
        };

        assessmentItems = [
          {
            id: 2,
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
            id: 1,
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
        ];
      });

      it('saves sorted assessment items containing parsed and sorted questions/answers/hints under a given node ID', () => {
        mutations.addNodeAssessmentDraft(state, { nodeId: 'node-1', assessmentItems });

        expect(state.nodesAssessmentDrafts).toEqual({
          'node-1': [
            {
              data: {
                id: 1,
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
              validation: {},
            },
            {
              data: {
                id: 2,
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
              validation: {},
            },
          ],
        });
      });
    });

    describe('sanitizeNodeAssessmentDraft', () => {
      beforeEach(() => {
        state = {
          nodesAssessmentDrafts: {
            'node-1': [
              {
                data: {
                  order: 0,
                  question: '',
                  answers: [],
                  hints: [],
                },
                validation: {},
              },
              {
                data: {
                  order: 1,
                  question: ' Question 2 text ',
                  answers: [],
                  hints: [],
                },
                validation: {},
              },
            ],
            'node-2': [
              {
                data: {
                  order: 0,
                  question: ' Question 1 text ',
                  answers: [
                    { answer: ' Answer 1', order: 1, correct: false },
                    { answer: '', order: 2, correct: true },
                    { answer: 'Answer 3 ', order: 3, correct: true },
                  ],
                  hints: [
                    { hint: ' ', order: 1 },
                    { hint: '', order: 2 },
                    { hint: ' Hint 3', order: 3 },
                  ],
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
            ],
          },
        };
      });

      it('sanitizes each assessment item of a correct node, removes empty items and reorders remaining items', () => {
        mutations.sanitizeNodeAssessmentDraft(state, { nodeId: 'node-2' });

        expect(state.nodesAssessmentDrafts).toEqual({
          'node-1': [
            {
              data: {
                order: 0,
                question: '',
                answers: [],
                hints: [],
              },
              validation: {},
            },
            {
              data: {
                order: 1,
                question: ' Question 2 text ',
                answers: [],
                hints: [],
              },
              validation: {},
            },
          ],
          'node-2': [
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
          ],
        });
      });
    });

    describe('sanitizeNodeAssessmentDraftItem', () => {
      beforeEach(() => {
        state = {
          nodesAssessmentDrafts: {
            'node-1': [
              {
                data: {
                  order: 0,
                  question: 'Node 1 - Question 1',
                  answers: [],
                  hints: [],
                },
                validation: {},
              },
            ],
            'node-2': [
              {
                data: {
                  order: 0,
                  question: ' Node 2 - Question 1 ',
                  answers: [
                    { answer: ' Answer 1', order: 1, correct: false },
                    { answer: '', order: 2, correct: true },
                    { answer: 'Answer 3 ', order: 3, correct: true },
                  ],
                  hints: [],
                },
                validation: {},
              },
              {
                data: {
                  order: 1,
                  question: ' Node 2 - Question 2 ',
                  answers: [{ answer: '', order: 1, correct: true }],
                  hints: [],
                },
                validation: {},
              },
            ],
          },
        };
      });

      it('sanitizes a correct assessment item of a correct node', () => {
        mutations.sanitizeNodeAssessmentDraftItem(state, {
          nodeId: 'node-2',
          assessmentItemIdx: 1,
        });

        expect(state.nodesAssessmentDrafts).toEqual({
          'node-1': [
            {
              data: {
                order: 0,
                question: 'Node 1 - Question 1',
                answers: [],
                hints: [],
              },
              validation: {},
            },
          ],
          'node-2': [
            {
              data: {
                order: 0,
                question: ' Node 2 - Question 1 ',
                answers: [
                  { answer: ' Answer 1', order: 1, correct: false },
                  { answer: '', order: 2, correct: true },
                  { answer: 'Answer 3 ', order: 3, correct: true },
                ],
                hints: [],
              },
              validation: {},
            },
            {
              data: {
                order: 1,
                question: 'Node 2 - Question 2',
                answers: [{ answer: '', order: 1, correct: true }],
                hints: [],
              },
              validation: {},
            },
          ],
        });
      });
    });

    describe('validateNodeAssessmentDraft', () => {
      beforeEach(() => {
        state = {
          nodesAssessmentDrafts: {
            'node-1': [
              {
                data: {
                  order: 0,
                  type: AssessmentItemTypes.SINGLE_SELECTION,
                  question: 'Node 1 - Question 1',
                  answers: [],
                  hints: [],
                },
                validation: {},
              },
            ],
            'node-2': [
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
            ],
          },
        };
      });

      it('saves validation results to each item of a correct node', () => {
        mutations.validateNodeAssessmentDraft(state, { nodeId: 'node-2' });

        expect(state.nodesAssessmentDrafts).toEqual({
          'node-1': [
            {
              data: {
                order: 0,
                type: AssessmentItemTypes.SINGLE_SELECTION,
                question: 'Node 1 - Question 1',
                answers: [],
                hints: [],
              },
              validation: {},
            },
          ],
          'node-2': [
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
          ],
        });
      });
    });

    describe('validateNodeAssessmentDraftItem', () => {
      beforeEach(() => {
        state = {
          nodesAssessmentDrafts: {
            'node-1': [
              {
                data: {
                  order: 0,
                  type: AssessmentItemTypes.SINGLE_SELECTION,
                  question: 'Node 1 - Question 1',
                  answers: [],
                  hints: [],
                },
                validation: {},
              },
            ],
            'node-2': [
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
            ],
          },
        };
      });

      it('saves validation results a correct item of a correct node', () => {
        mutations.validateNodeAssessmentDraftItem(state, {
          nodeId: 'node-2',
          assessmentItemIdx: 1,
        });

        expect(state.nodesAssessmentDrafts).toEqual({
          'node-1': [
            {
              data: {
                order: 0,
                type: AssessmentItemTypes.SINGLE_SELECTION,
                question: 'Node 1 - Question 1',
                answers: [],
                hints: [],
              },
              validation: {},
            },
          ],
          'node-2': [
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
              validation: {
                questionErrors: [AssessmentItemValidationErrors.BLANK_QUESTION],
                answersErrors: [AssessmentItemValidationErrors.INVALID_NUMBER_OF_CORRECT_ANSWERS],
              },
            },
          ],
        });
      });
    });

    describe('addNodeAssessmentDraftItem', () => {
      describe('when there are no assessment items for a given node yet', () => {
        beforeEach(() => {
          state = {
            nodesAssessmentDrafts: {},
          };
        });

        it('adds a new node entry and saves a new assessment item with a correct order and default values', () => {
          mutations.addNodeAssessmentDraftItem(state, { nodeId: 'node-1' });

          expect(state.nodesAssessmentDrafts).toEqual({
            'node-1': [
              {
                data: {
                  question: '',
                  type: AssessmentItemTypes.SINGLE_SELECTION,
                  order: 0,
                },
                validation: {},
              },
            ],
          });
        });
      });

      describe('when there are some assessment items for a given node', () => {
        beforeEach(() => {
          state = {
            nodesAssessmentDrafts: {
              'node-1': [
                {
                  data: {
                    question: 'Node 1 - Question 1',
                    order: 0,
                  },
                  validation: {},
                },
              ],
              'node-2': [
                {
                  data: {
                    question: 'Node 2 - Question 1',
                    order: 0,
                  },
                  validation: {},
                },
              ],
            },
          };
        });

        it('saves a new assessment item with a correct order and default values to a correct node', () => {
          mutations.addNodeAssessmentDraftItem(state, { nodeId: 'node-1' });

          expect(state.nodesAssessmentDrafts).toEqual({
            'node-1': [
              {
                data: {
                  question: 'Node 1 - Question 1',
                  order: 0,
                },
                validation: {},
              },
              {
                data: {
                  question: '',
                  type: AssessmentItemTypes.SINGLE_SELECTION,
                  order: 1,
                },
                validation: {},
              },
            ],
            'node-2': [
              {
                data: {
                  question: 'Node 2 - Question 1',
                  order: 0,
                },
                validation: {},
              },
            ],
          });
        });
      });

      describe('before/after', () => {
        beforeEach(() => {
          state = {
            nodesAssessmentDrafts: {
              'node-1': [
                {
                  data: {
                    question: 'Node 1 - Question 1',
                    order: 0,
                  },
                  validation: {},
                },
                {
                  data: {
                    question: 'Node 1 - Question 1',
                    order: 1,
                  },
                  validation: {},
                },
              ],
            },
          };
        });

        it('saves a new assessment item before an item with this index and updates `order` field of all items when `before` specified', () => {
          mutations.addNodeAssessmentDraftItem(state, { nodeId: 'node-1', before: 1 });

          expect(state.nodesAssessmentDrafts).toEqual({
            'node-1': [
              {
                data: {
                  question: 'Node 1 - Question 1',
                  order: 0,
                },
                validation: {},
              },
              {
                data: {
                  question: '',
                  type: AssessmentItemTypes.SINGLE_SELECTION,
                  order: 1,
                },
                validation: {},
              },
              {
                data: {
                  question: 'Node 1 - Question 1',
                  order: 2,
                },
                validation: {},
              },
            ],
          });
        });

        it('saves a new assessment item after an item with this index and updates `order` field of all items when `after` specified', () => {
          mutations.addNodeAssessmentDraftItem(state, { nodeId: 'node-1', after: 0 });

          expect(state.nodesAssessmentDrafts).toEqual({
            'node-1': [
              {
                data: {
                  question: 'Node 1 - Question 1',
                  order: 0,
                },
                validation: {},
              },
              {
                data: {
                  question: '',
                  type: AssessmentItemTypes.SINGLE_SELECTION,
                  order: 1,
                },
                validation: {},
              },
              {
                data: {
                  question: 'Node 1 - Question 1',
                  order: 2,
                },
                validation: {},
              },
            ],
          });
        });
      });
    });

    describe('updateNodeAssessmentDraftItemData', () => {
      beforeEach(() => {
        state = {
          nodesAssessmentDrafts: {
            'node-1': [
              {
                data: {
                  question: 'Node 1 - Question 1',
                  type: AssessmentItemTypes.SINGLE_SELECTION,
                  order: 0,
                },
                validation: {},
              },
              {
                data: {
                  question: 'Node 1 - Question 2',
                  type: AssessmentItemTypes.MULTIPLE_SELECTION,
                  order: 1,
                },
                validation: {},
              },
            ],
            'node-2': [
              {
                data: {
                  question: 'Node 2 - Question 1',
                  order: 0,
                },
                validation: {},
              },
            ],
          },
        };
      });

      it('updates a correct node assessment draft item', () => {
        mutations.updateNodeAssessmentDraftItemData(state, {
          nodeId: 'node-1',
          assessmentItemIdx: 1,
          data: {
            question: 'Node 1 - Updated Question 2',
            type: AssessmentItemTypes.TRUE_FALSE,
          },
        });

        expect(state.nodesAssessmentDrafts).toEqual({
          'node-1': [
            {
              data: {
                question: 'Node 1 - Question 1',
                type: AssessmentItemTypes.SINGLE_SELECTION,
                order: 0,
              },
              validation: {},
            },
            {
              data: {
                question: 'Node 1 - Updated Question 2',
                type: AssessmentItemTypes.TRUE_FALSE,
                order: 1,
              },
              validation: {},
            },
          ],
          'node-2': [
            {
              data: {
                question: 'Node 2 - Question 1',
                order: 0,
              },
              validation: {},
            },
          ],
        });
      });
    });

    describe('deleteNodeAssessmentDraftItem', () => {
      beforeEach(() => {
        state = {
          nodesAssessmentDrafts: {
            'node-1': [
              {
                data: {
                  question: 'Node 1 - Question 1',
                  order: 0,
                },
                validation: {},
              },
            ],
            'node-2': [
              {
                data: {
                  question: 'Node 2 - Question 1',
                  type: AssessmentItemTypes.SINGLE_SELECTION,
                  order: 0,
                },
                validation: {},
              },
              {
                data: {
                  question: 'Node 2 - Question 2',
                  type: AssessmentItemTypes.MULTIPLE_SELECTION,
                  order: 1,
                },
                validation: {},
              },
              {
                data: {
                  question: 'Node 2 - Question 3',
                  type: AssessmentItemTypes.TRUE_FALSE,
                  order: 2,
                },
                validation: {},
              },
            ],
          },
        };
      });

      it('deletes a correct node assessment draft item and reorders remaining items belonging to the node', () => {
        mutations.deleteNodeAssessmentDraftItem(state, {
          nodeId: 'node-2',
          assessmentItemIdx: 1,
        });

        expect(state).toEqual({
          nodesAssessmentDrafts: {
            'node-1': [
              {
                data: {
                  question: 'Node 1 - Question 1',
                  order: 0,
                },
                validation: {},
              },
            ],
            'node-2': [
              {
                data: {
                  question: 'Node 2 - Question 1',
                  type: AssessmentItemTypes.SINGLE_SELECTION,
                  order: 0,
                },
                validation: {},
              },
              {
                data: {
                  question: 'Node 2 - Question 3',
                  type: AssessmentItemTypes.TRUE_FALSE,
                  order: 1,
                },
                validation: {},
              },
            ],
          },
        });
      });
    });
  });

  describe('swapNodeAssessmentDraftItems', () => {
    beforeEach(() => {
      state = {
        nodesAssessmentDrafts: {
          'node-1': [
            {
              data: {
                question: 'Node 1 - Question 1',
                order: 0,
              },
              validation: {},
            },
          ],
          'node-2': [
            {
              data: {
                question: 'Node 2 - Question 1',
                type: AssessmentItemTypes.SINGLE_SELECTION,
                order: 0,
              },
              validation: {},
            },
            {
              data: {
                question: 'Node 2 - Question 2',
                type: AssessmentItemTypes.MULTIPLE_SELECTION,
                order: 1,
              },
              validation: {},
            },
            {
              data: {
                question: 'Node 2 - Question 3',
                type: AssessmentItemTypes.TRUE_FALSE,
                order: 2,
              },
              validation: {},
            },
          ],
        },
      };
    });

    it('swaps correct node assessment draft items and reorders all items belonging to the node', () => {
      mutations.swapNodeAssessmentDraftItems(state, {
        nodeId: 'node-2',
        firstItemIdx: 0,
        secondItemIdx: 2,
      });

      expect(state.nodesAssessmentDrafts).toEqual({
        'node-1': [
          {
            data: {
              question: 'Node 1 - Question 1',
              order: 0,
            },
            validation: {},
          },
        ],
        'node-2': [
          {
            data: {
              question: 'Node 2 - Question 3',
              type: AssessmentItemTypes.TRUE_FALSE,
              order: 0,
            },
            validation: {},
          },
          {
            data: {
              question: 'Node 2 - Question 2',
              type: AssessmentItemTypes.MULTIPLE_SELECTION,
              order: 1,
            },
            validation: {},
          },
          {
            data: {
              question: 'Node 2 - Question 1',
              type: AssessmentItemTypes.SINGLE_SELECTION,
              order: 2,
            },
            validation: {},
          },
        ],
      });
    });
  });

  describe('openDialog', () => {
    beforeEach(() => {
      state = {
        dialog: {
          open: false,
          title: '',
          message: '',
          submitLabel: '',
          onSubmit: () => {},
          onCancel: () => {},
        },
      };
    });

    it('sets correct data', () => {
      mutations.openDialog(state, {
        title: 'My Dialog',
        message: 'Are you sure?',
        submitLabel: 'Yes!',
      });

      expect(state.dialog.open).toBe(true);
      expect(state.dialog.title).toBe('My Dialog');
      expect(state.dialog.message).toBe('Are you sure?');
      expect(state.dialog.submitLabel).toBe('Yes!');
    });

    it('calls a correct function on submit and closes dialog afterwards', () => {
      const submitFn = jest.fn();

      mutations.openDialog(state, {
        title: 'My Dialog',
        message: 'Are you sure?',
        submitLabel: 'Yes!',
        onSubmit: submitFn,
      });

      state.dialog.onSubmit();
      expect(submitFn).toHaveBeenCalled();

      expect(state.dialog.open).toBe(false);
      expect(state.dialog.title).toBe('');
      expect(state.dialog.message).toBe('');
      expect(state.dialog.submitLabel).toBe('');
    });

    it('calls a correct function on submit and closes dialog afterwards', () => {
      const cancelFn = jest.fn();

      mutations.openDialog(state, {
        title: 'My Dialog',
        message: 'Are you sure?',
        submitLabel: 'Yes!',
        onCancel: cancelFn,
      });

      state.dialog.onCancel();
      expect(cancelFn).toHaveBeenCalled();

      expect(state.dialog.open).toBe(false);
      expect(state.dialog.title).toBe('');
      expect(state.dialog.message).toBe('');
      expect(state.dialog.submitLabel).toBe('');
    });
  });
});
