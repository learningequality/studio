import { UPDATE_ASSESSMENTITEM, DELETE_ASSESSMENTITEM } from '../mutations';
import { AssessmentItemTypes } from 'shared/constants';

describe('assessmentItem mutations', () => {
  let state;

  beforeEach(() => {
    state = {
      assessmentItemsMap: {
        'content-node-id-1': {
          'assessment-id-1': {
            assessment_id: 'assessment-id-1',
            contentnode: 'content-node-id-1',
            type: AssessmentItemTypes.SINGLE_SELECTION,
            question: '1+1=?',
            answers: [
              {
                answer: '2',
                correct: false,
                order: 1,
              },
              {
                answer: '11',
                correct: true,
                order: 2,
              },
            ],
            hints: [],
          },
        },
        'content-node-id-2': {
          'assessment-id-2': {
            assessment_id: 'assessment-id-2',
            contentnode: 'content-node-id-2',
            type: AssessmentItemTypes.SINGLE_SELECTION,
            question: '',
            answers: [],
            hints: [],
          },
          'assessment-id-3': {
            assessment_id: 'assessment-id-3',
            contentnode: 'content-node-id-2',
            type: AssessmentItemTypes.SINGLE_SELECTION,
            question: 'What color are minions?',
            answers: [
              {
                answer: 'Blue',
                correct: false,
                order: 1,
              },
              {
                answer: 'Yellow',
                correct: true,
                order: 2,
              },
            ],
            hints: [],
          },
        },
      },
    };
  });

  describe('UPDATE_ASSESSMENTITEM', () => {
    it('adds a new assessment item, parses and sorts answers and hints', () => {
      UPDATE_ASSESSMENTITEM(state, {
        assessment_id: 'assessment-id-4',
        contentnode: 'content-node-id-1',
        type: AssessmentItemTypes.SINGLE_SELECTION,
        question: 'Question',
        answers: JSON.stringify([
          {
            answer: 'Answer 2',
            correct: false,
            order: 2,
          },
          {
            answer: 'Answer 1',
            correct: true,
            order: 1,
          },
        ]),
        hints: JSON.stringify([
          {
            answer: 'Hint 2',
            order: 2,
          },
          {
            answer: 'Hint 1',
            order: 1,
          },
        ]),
      });

      expect(state.assessmentItemsMap['content-node-id-1']['assessment-id-4']).toEqual({
        assessment_id: 'assessment-id-4',
        contentnode: 'content-node-id-1',
        type: AssessmentItemTypes.SINGLE_SELECTION,
        question: 'Question',
        answers: [
          {
            answer: 'Answer 1',
            correct: true,
            order: 1,
          },
          {
            answer: 'Answer 2',
            correct: false,
            order: 2,
          },
        ],
        hints: [
          {
            answer: 'Hint 1',
            order: 1,
          },
          {
            answer: 'Hint 2',
            order: 2,
          },
        ],
      });
    });

    it('updates an assessment item, parses and sorts answers and hints', () => {
      UPDATE_ASSESSMENTITEM(state, {
        assessment_id: 'assessment-id-3',
        contentnode: 'content-node-id-2',
        type: AssessmentItemTypes.SINGLE_SELECTION,
        question: 'What color are minions?',
        answers: JSON.stringify([
          {
            answer: 'Blue',
            correct: false,
            order: 3,
          },
          {
            answer: 'Yellow',
            correct: true,
            order: 1,
          },
          {
            answer: 'Red',
            correct: false,
            order: 2,
          },
        ]),
        hints: JSON.stringify([
          {
            answer: 'Not red',
            order: 2,
          },
          {
            answer: 'Not blue',
            order: 1,
          },
        ]),
      });

      expect(state.assessmentItemsMap['content-node-id-2']['assessment-id-3']).toEqual({
        assessment_id: 'assessment-id-3',
        contentnode: 'content-node-id-2',
        type: AssessmentItemTypes.SINGLE_SELECTION,
        question: 'What color are minions?',
        answers: [
          {
            answer: 'Yellow',
            correct: true,
            order: 1,
          },
          {
            answer: 'Red',
            correct: false,
            order: 2,
          },
          {
            answer: 'Blue',
            correct: false,
            order: 3,
          },
        ],
        hints: [
          {
            answer: 'Not blue',
            order: 1,
          },
          {
            answer: 'Not red',
            order: 2,
          },
        ],
      });
    });
  });

  describe('DELETE_ASSESSMENTITEM', () => {
    it('removes an assessment item', () => {
      DELETE_ASSESSMENTITEM(state, {
        assessment_id: 'assessment-id-3',
        contentnode: 'content-node-id-2',
        type: AssessmentItemTypes.SINGLE_SELECTION,
        question: 'What color are minions?',
        answers: [
          {
            answer: 'Blue',
            correct: false,
            order: 1,
          },
          {
            answer: 'Yellow',
            correct: true,
            order: 2,
          },
        ],
        hints: [],
      });

      expect(state.assessmentItemsMap['content-node-id-2']).toEqual({
        'assessment-id-2': {
          assessment_id: 'assessment-id-2',
          contentnode: 'content-node-id-2',
          type: AssessmentItemTypes.SINGLE_SELECTION,
          question: '',
          answers: [],
          hints: [],
        },
      });
    });
  });
});
