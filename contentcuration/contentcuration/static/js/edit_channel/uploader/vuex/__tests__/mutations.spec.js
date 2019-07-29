import { initializeNodeAssessmentDraft } from '../mutations';

describe('edit_modal', () => {
  let state;

  describe('mutations', () => {
    describe('initializeNodeAssessmentDraft', () => {
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
        initializeNodeAssessmentDraft(state, { nodeId: 'node-1', assessmentItems });

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
  });
});
