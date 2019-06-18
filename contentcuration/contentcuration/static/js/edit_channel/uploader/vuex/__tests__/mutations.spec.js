import { AssessmentItemTypes } from '../../constants';

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
            {
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
          mutations.addNodeAssessmentDraftItem(state, 'node-1');

          expect(state.nodesAssessmentDrafts).toEqual({
            'node-1': [
              {
                question: '',
                type: AssessmentItemTypes.SINGLE_SELECTION,
                order: 0,
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
                  question: 'Node 1 - Question 1',
                  order: 0,
                },
              ],
              'node-2': [
                {
                  question: 'Node 2 - Question 1',
                  order: 0,
                },
              ],
            },
          };
        });

        it('saves a new assessment item with a correct order and default values to a correct node', () => {
          mutations.addNodeAssessmentDraftItem(state, 'node-1');

          expect(state.nodesAssessmentDrafts).toEqual({
            'node-1': [
              {
                question: 'Node 1 - Question 1',
                order: 0,
              },
              {
                question: '',
                type: AssessmentItemTypes.SINGLE_SELECTION,
                order: 1,
              },
            ],
            'node-2': [
              {
                question: 'Node 2 - Question 1',
                order: 0,
              },
            ],
          });
        });
      });
    });

    describe('updateNodeAssessmentDraftItem', () => {
      beforeEach(() => {
        state = {
          nodesAssessmentDrafts: {
            'node-1': [
              {
                question: 'Node 1 - Question 1',
                type: AssessmentItemTypes.SINGLE_SELECTION,
                order: 0,
              },
              {
                question: 'Node 1 - Question 2',
                type: AssessmentItemTypes.MULTIPLE_SELECTION,
                order: 1,
              },
            ],
            'node-2': [
              {
                question: 'Node 2 - Question 1',
                order: 0,
              },
            ],
          },
        };
      });

      it('updates a correct node assessment draft item', () => {
        mutations.updateNodeAssessmentDraftItem(state, {
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
              question: 'Node 1 - Question 1',
              type: AssessmentItemTypes.SINGLE_SELECTION,
              order: 0,
            },
            {
              question: 'Node 1 - Updated Question 2',
              type: AssessmentItemTypes.TRUE_FALSE,
              order: 1,
            },
          ],
          'node-2': [
            {
              question: 'Node 2 - Question 1',
              order: 0,
            },
          ],
        });
      });
    });
  });
});
