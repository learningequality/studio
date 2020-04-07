import { AssessmentItemTypes } from '../../../constants';
import { ADD_ASSESSMENTITEM, ADD_ASSESSMENTITEMS, DELETE_ASSESSMENTITEM } from '../mutations';

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

  describe('ADD_ASSESSMENTITEM', () => {
    it('adds a new assessment item', () => {
      ADD_ASSESSMENTITEM(state, {
        assessment_id: 'assessment-id-4',
        contentnode: 'content-node-id-1',
        type: AssessmentItemTypes.SINGLE_SELECTION,
        question: '',
        answers: [],
        hints: [],
      });

      expect(state.assessmentItemsMap['content-node-id-1']['assessment-id-4']).toEqual({
        assessment_id: 'assessment-id-4',
        contentnode: 'content-node-id-1',
        type: AssessmentItemTypes.SINGLE_SELECTION,
        question: '',
        answers: [],
        hints: [],
      });
    });

    it('updates an existing assessment item', () => {
      ADD_ASSESSMENTITEM(state, {
        assessment_id: 'assessment-id-3',
        contentnode: 'content-node-id-2',
        type: AssessmentItemTypes.MULTIPLE_SELECTION,
        question: 'What color are minions?',
        answers: [
          {
            answer: 'Yellow',
            correct: true,
            order: 1,
          },
          {
            answer: 'Blue',
            correct: false,
            order: 2,
          },
        ],
        hints: [],
      });

      expect(state.assessmentItemsMap['content-node-id-2']['assessment-id-3']).toEqual({
        assessment_id: 'assessment-id-3',
        contentnode: 'content-node-id-2',
        type: AssessmentItemTypes.MULTIPLE_SELECTION,
        question: 'What color are minions?',
        answers: [
          {
            answer: 'Yellow',
            correct: true,
            order: 1,
          },
          {
            answer: 'Blue',
            correct: false,
            order: 2,
          },
        ],
        hints: [],
      });
    });

    it('parses and sorts answers and hints before saving', () => {
      const state = {
        assessmentItemsMap: {},
      };

      ADD_ASSESSMENTITEM(state, {
        assessment_id: 'assessment-id-1',
        contentnode: 'content-node-id-1',
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

      expect(state.assessmentItemsMap['content-node-id-1']['assessment-id-1']).toEqual({
        assessment_id: 'assessment-id-1',
        contentnode: 'content-node-id-1',
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
  });

  describe('ADD_ASSESSMENTITEMS', () => {
    it('adds new assessment items and updates existing assessment items', () => {
      ADD_ASSESSMENTITEMS(state, [
        {
          assessment_id: 'assessment-id-4',
          contentnode: 'content-node-id-1',
          type: AssessmentItemTypes.SINGLE_SELECTION,
          question: '',
          answers: [],
          hints: [],
        },
        {
          assessment_id: 'assessment-id-3',
          contentnode: 'content-node-id-2',
          type: AssessmentItemTypes.MULTIPLE_SELECTION,
          question: 'What color are minions?',
          answers: [
            {
              answer: 'Yellow',
              correct: true,
              order: 1,
            },
            {
              answer: 'Blue',
              correct: false,
              order: 2,
            },
          ],
          hints: [],
        },
      ]);

      expect(state.assessmentItemsMap).toEqual({
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
          'assessment-id-4': {
            assessment_id: 'assessment-id-4',
            contentnode: 'content-node-id-1',
            type: AssessmentItemTypes.SINGLE_SELECTION,
            question: '',
            answers: [],
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
            type: AssessmentItemTypes.MULTIPLE_SELECTION,
            question: 'What color are minions?',
            answers: [
              {
                answer: 'Yellow',
                correct: true,
                order: 1,
              },
              {
                answer: 'Blue',
                correct: false,
                order: 2,
              },
            ],
            hints: [],
          },
        },
      });
    });

    it('parses and sorts answers and hints before saving', () => {
      const state = {
        assessmentItemsMap: {},
      };

      ADD_ASSESSMENTITEMS(state, [
        {
          assessment_id: 'assessment-id-1',
          contentnode: 'content-node-id-1',
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
        },
      ]);

      expect(state.assessmentItemsMap).toEqual({
        'content-node-id-1': {
          'assessment-id-1': {
            assessment_id: 'assessment-id-1',
            contentnode: 'content-node-id-1',
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
          },
        },
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
