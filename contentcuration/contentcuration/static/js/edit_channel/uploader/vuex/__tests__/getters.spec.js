var getters = require('../getters');

describe('edit_modal', () => {
  let state;

  describe('getters', () => {
    describe('nodeAssessmentDraft', () => {
      beforeEach(() => {
        state = {
          nodesAssessmentDrafts: {
            'node-1': [
              {
                id: 1,
                order: 0,
                question: 'Node 1 - Question 1',
              },
            ],
            'node-2': [
              {
                id: 2,
                order: 0,
                question: 'Node 2 - Question 1',
              },
              {
                id: 3,
                order: 1,
                question: 'Node 2 - Question 2',
              },
            ],
          },
        };
      });

      it('returns null when an assessment draft not available for a given node ID', () => {
        expect(getters.nodeAssessmentDraft(state)('node-3')).toBeNull();
      });

      it('returns an assessment draft belonging to a given node ID', () => {
        expect(getters.nodeAssessmentDraft(state)('node-2')).toEqual([
          {
            id: 2,
            order: 0,
            question: 'Node 2 - Question 1',
          },
          {
            id: 3,
            order: 1,
            question: 'Node 2 - Question 2',
          },
        ]);
      });
    });
  });
});
