import { AssessmentItemTypes, ValidationErrors } from '../../constants';
import {
  SET_NODE_ASSESSMENT_ITEMS,
  SANITIZE_NODE_ASSESSMENT_ITEMS,
  VALIDATE_NODE_DETAILS,
  VALIDATE_NODE_ASSESSMENT_ITEMS,
} from '../mutations';

describe('edit_modal', () => {
  describe('mutations', () => {
    describe('SET_NODE_ASSESSMENT_ITEMS', () => {
      let state;

      beforeEach(() => {
        state = {
          nodes: [
            {
              id: 'id-1',
              title: 'Node 1',
              assessment_items: [],
            },
            {
              id: 'id-2',
              title: 'Node 2',
              assessment_items: [
                {
                  id: 1,
                  order: 0,
                  question: 'Question 1',
                  answers: [
                    { answer: 'Question 1 - Answer 1', correct: true, order: 1 },
                    { answer: 'Question 1 - Answer 2', correct: false, order: 2 },
                  ],
                  hints: [],
                },
              ],
            },
            {
              id: 'id-3',
              title: 'Node 3',
              assessment_items: [],
            },
          ],
        };
      });

      it('updates assessment items of a correct node', () => {
        SET_NODE_ASSESSMENT_ITEMS(state, {
          nodeIdx: 1,
          assessmentItems: [
            {
              id: 1,
              order: 0,
              question: 'Question 1',
              answers: [],
              hints: [],
            },
            {
              id: 1,
              order: 0,
              question: 'Question 2',
              answers: [],
              hints: [{ hint: 'Hint 1', order: 1 }],
            },
          ],
        });

        expect(state.nodes).toEqual([
          {
            id: 'id-1',
            title: 'Node 1',
            assessment_items: [],
          },
          {
            id: 'id-2',
            title: 'Node 2',
            assessment_items: [
              {
                id: 1,
                order: 0,
                question: 'Question 1',
                answers: [],
                hints: [],
              },
              {
                id: 1,
                order: 0,
                question: 'Question 2',
                answers: [],
                hints: [{ hint: 'Hint 1', order: 1 }],
              },
            ],
          },
          {
            id: 'id-3',
            title: 'Node 3',
            assessment_items: [],
          },
        ]);
      });
    });

    describe('SANITIZE_NODE_ASSESSMENT_ITEMS', () => {
      let state;

      beforeEach(() => {
        state = {
          nodes: [
            {
              id: 'id-1',
              title: 'Node 1',
              assessment_items: [],
            },
            {
              id: 'id-2',
              title: 'Node 2',
              assessment_items: [
                {
                  id: 1,
                  order: 0,
                  question: '  Question 1 ',
                  answers: [
                    { answer: ' Question 1 - Answer 1  ', correct: true, order: 1 },
                    { answer: ' Question 1 - Answer 2', correct: false, order: 2 },
                  ],
                  hints: [{ hint: ' Hint 1  ', order: 1 }],
                },
                {
                  id: 2,
                  order: 1,
                  question: '',
                  answers: [],
                  hints: [],
                },
              ],
            },
            {
              id: 'id-3',
              title: 'Node 3',
              assessment_items: [],
            },
          ],
        };
      });

      it('sanitizes assessment items of a correct node', () => {
        SANITIZE_NODE_ASSESSMENT_ITEMS(state, { nodeIdx: 1 });

        expect(state.nodes).toEqual([
          {
            id: 'id-1',
            title: 'Node 1',
            assessment_items: [],
          },
          {
            id: 'id-2',
            title: 'Node 2',
            assessment_items: [
              {
                id: 1,
                order: 0,
                question: 'Question 1',
                answers: [
                  { answer: 'Question 1 - Answer 1', correct: true, order: 1 },
                  { answer: 'Question 1 - Answer 2', correct: false, order: 2 },
                ],
                hints: [{ hint: 'Hint 1', order: 1 }],
              },
            ],
          },
          {
            id: 'id-3',
            title: 'Node 3',
            assessment_items: [],
          },
        ]);
      });
    });

    describe('VALIDATE_NODE_DETAILS', () => {
      let state;

      beforeEach(() => {
        state = {
          nodes: [
            {
              id: 'id-1',
              title: 'Node 1',
            },
            {
              id: 'id-2',
              title: '',
            },
          ],
          validation: [],
        };
      });

      it('validates a given node and saves validation results', () => {
        VALIDATE_NODE_DETAILS(state, { nodeIdx: 1 });

        expect(state.validation).toEqual([
          {
            nodeIdx: 1,
            errors: {
              details: [ValidationErrors.TITLE_REQUIRED, ValidationErrors.LICENCE_REQUIRED],
            },
          },
        ]);
      });
    });

    describe('VALIDATE_NODE_ASSESSMENT_ITEMS', () => {
      let state;

      beforeEach(() => {
        state = {
          nodes: [
            {
              id: 'id-1',
              title: 'Node 1',
              assessment_items: [],
            },
            {
              id: 'id-2',
              title: '',
              assessment_items: [
                {
                  id: 1,
                  type: AssessmentItemTypes.SINGLE_SELECTION,
                  question: '',
                  answers: [
                    { answer: 'Question 1 - Answer 1', correct: true, order: 1 },
                    { answer: 'Question 1 - Answer 2', correct: true, order: 2 },
                  ],
                  hints: [{ hint: 'Hint 1', order: 1 }],
                },
                {
                  id: 2,
                  type: AssessmentItemTypes.SINGLE_SELECTION,
                  question: '',
                  answers: [
                    { answer: 'Question 2 - Answer 1', correct: true, order: 1 },
                    { answer: 'Question 2 - Answer 2', correct: false, order: 2 },
                  ],
                  hints: [],
                },
              ],
            },
          ],
          validation: [],
        };
      });

      it('validates a given node and saves validation results', () => {
        VALIDATE_NODE_ASSESSMENT_ITEMS(state, { nodeIdx: 1 });

        expect(state.validation).toEqual([
          {
            nodeIdx: 1,
            errors: {
              assessment_items: [
                [
                  ValidationErrors.QUESTION_REQUIRED,
                  ValidationErrors.INVALID_NUMBER_OF_CORRECT_ANSWERS,
                ],
                [ValidationErrors.QUESTION_REQUIRED],
              ],
            },
          },
        ]);
      });
    });
  });
});
