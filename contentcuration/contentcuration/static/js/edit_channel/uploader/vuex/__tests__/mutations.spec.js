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
  });
});
