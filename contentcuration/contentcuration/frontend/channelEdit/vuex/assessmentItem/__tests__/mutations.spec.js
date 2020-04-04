import { AssessmentItemTypes } from '../../../constants';
import { ADD_ASSESSMENTITEM, ADD_ASSESSMENTITEMS, REMOVE_ASSESSMENTITEM } from '../mutations';

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
          },
        },
        'content-node-id-2': {
          'assessment-id-2': {
            assessment_id: 'assessment-id-2',
            contentnode: 'content-node-id-2',
            type: AssessmentItemTypes.SINGLE_SELECTION,
            question: '',
            answers: [],
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
      });

      expect(state.assessmentItemsMap['content-node-id-1']['assessment-id-4']).toEqual({
        assessment_id: 'assessment-id-4',
        contentnode: 'content-node-id-1',
        type: AssessmentItemTypes.SINGLE_SELECTION,
        question: '',
        answers: [],
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
          },
          'assessment-id-4': {
            assessment_id: 'assessment-id-4',
            contentnode: 'content-node-id-1',
            type: AssessmentItemTypes.SINGLE_SELECTION,
            question: '',
            answers: [],
          },
        },
        'content-node-id-2': {
          'assessment-id-2': {
            assessment_id: 'assessment-id-2',
            contentnode: 'content-node-id-2',
            type: AssessmentItemTypes.SINGLE_SELECTION,
            question: '',
            answers: [],
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
          },
        },
      });
    });
  });

  describe('REMOVE_ASSESSMENTITEM', () => {
    it('removes an assessment item', () => {
      REMOVE_ASSESSMENTITEM(state, {
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
      });

      expect(state.assessmentItemsMap['content-node-id-2']).toEqual({
        'assessment-id-2': {
          assessment_id: 'assessment-id-2',
          contentnode: 'content-node-id-2',
          type: AssessmentItemTypes.SINGLE_SELECTION,
          question: '',
          answers: [],
        },
      });
    });
  });
});
