import { AssessmentItemTypes } from '../../constants';

var mutations = require('../mutations');

describe('edit_modal', () => {
  let state;

  describe('mutations', () => {
    describe('addNodeAssessmentDraft', () => {
      beforeEach(() => {
        state = {
          nodesAssessmentDrafts: {},
        };
      });

      it('saves assessment items under a given node ID', () => {
        const assessmentItems = [
          {
            id: 1,
            order: 0,
            question: 'Question 1',
          },
          {
            id: 2,
            order: 1,
            question: 'Question 2',
          },
        ];

        mutations.addNodeAssessmentDraft(state, { nodeId: 'node-1', assessmentItems });

        expect(state.nodesAssessmentDrafts).toEqual({
          'node-1': assessmentItems,
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
