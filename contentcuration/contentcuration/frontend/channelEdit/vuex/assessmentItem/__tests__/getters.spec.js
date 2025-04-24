import {
  getAssessmentItems,
  getAssessmentItemsCount,
  getAssessmentItemsErrors,
  getInvalidAssessmentItemsCount,
  getAssessmentItemsAreValid,
} from '../getters';
import { AssessmentItemTypes, DELAYED_VALIDATION, ValidationErrors } from 'shared/constants';

describe('assessmentItem getters', () => {
  let state;
  let rootGetters;

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
            order: 1,
          },
          'assessment-id-3': {
            assessment_id: 'assessment-id-3',
            contentnode: 'content-node-id-2',
            [DELAYED_VALIDATION]: true,
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
                correct: false,
                order: 2,
              },
            ],
            order: 2,
          },
        },
        'content-node-id-3': {
          'assessment-id-4': {
            assessment_id: 'assessment-id-4',
            contentnode: 'content-node-id-3',
            [DELAYED_VALIDATION]: true,
            type: AssessmentItemTypes.SINGLE_SELECTION,
            question: '',
            answers: [],
          },
          'assessment-id-5': {
            assessment_id: 'assessment-id-5',
            contentnode: 'content-node-id-3',
            [DELAYED_VALIDATION]: true,
            type: AssessmentItemTypes.SINGLE_SELECTION,
            question: '',
            answers: [],
          },
        },
      },
    };

    rootGetters = {
      'contentNode/getContentNode': id => ({
        id,
        kind: 'exercise',
      }),
    };
  });

  describe('getAssessmentItems', () => {
    it('returns an empty array if a content node not found', () => {
      expect(getAssessmentItems(state)('content-node-id-4')).toEqual([]);
    });

    it('returns an array of assessment items belonging to a content node', () => {
      expect(getAssessmentItems(state)('content-node-id-2')).toEqual([
        {
          assessment_id: 'assessment-id-2',
          contentnode: 'content-node-id-2',
          type: AssessmentItemTypes.SINGLE_SELECTION,
          question: '',
          answers: [],
          order: 1,
        },
        {
          assessment_id: 'assessment-id-3',
          contentnode: 'content-node-id-2',
          [DELAYED_VALIDATION]: true,
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
              correct: false,
              order: 2,
            },
          ],
          order: 2,
        },
      ]);
    });
  });

  describe('getAssessmentItemsCount', () => {
    it('returns 0 if a content node not found', () => {
      expect(getAssessmentItemsCount(state)('content-node-id-4')).toBe(0);
    });

    it('returns correct total number of assessment items belonging to a content node', () => {
      expect(getAssessmentItemsCount(state)('content-node-id-2')).toBe(2);
    });
  });

  describe('getAssessmentItemsErrors', () => {
    it('returns validation codes corresponding to invalid assessment items of a content node', () => {
      expect(
        getAssessmentItemsErrors(state, {}, {}, rootGetters)({ contentNodeId: 'content-node-id-2' })
      ).toEqual({
        'assessment-id-2': [
          ValidationErrors.QUESTION_REQUIRED,
          ValidationErrors.INVALID_NUMBER_OF_CORRECT_ANSWERS,
        ],
        'assessment-id-3': [ValidationErrors.INVALID_NUMBER_OF_CORRECT_ANSWERS],
      });
    });

    it("doesn't include invalid nodes errors that are new if `ignoreDelayed` set to true", () => {
      expect(
        getAssessmentItemsErrors(
          state,
          {},
          {},
          rootGetters
        )({ contentNodeId: 'content-node-id-2', ignoreDelayed: true })
      ).toEqual({
        'assessment-id-2': [
          ValidationErrors.QUESTION_REQUIRED,
          ValidationErrors.INVALID_NUMBER_OF_CORRECT_ANSWERS,
        ],
        'assessment-id-3': [],
      });
    });
  });

  describe('getInvalidAssessmentItemsCount', () => {
    it('returns a correct number of invalid assessment items of a content node', () => {
      expect(
        getInvalidAssessmentItemsCount(
          state,
          {},
          {},
          rootGetters
        )({ contentNodeId: 'content-node-id-2' })
      ).toBe(2);
    });

    it("doesn't count invalid nodes that are new if `ignoreDelayed` set to true", () => {
      expect(
        getInvalidAssessmentItemsCount(
          state,
          {},
          {},
          rootGetters
        )({
          contentNodeId: 'content-node-id-2',
          ignoreDelayed: true,
        })
      ).toBe(1);
    });
  });

  describe('getAssessmentItemsAreValid', () => {
    it('returns true if all assessment items of a content node are valid', () => {
      expect(
        getAssessmentItemsAreValid(
          state,
          {},
          {},
          rootGetters
        )({ contentNodeId: 'content-node-id-1' })
      ).toBe(true);
    });

    it('returns false if all assessment items of a content node are not valid', () => {
      expect(
        getAssessmentItemsAreValid(
          state,
          {},
          {},
          rootGetters
        )({ contentNodeId: 'content-node-id-2' })
      ).toBe(false);
    });

    it('returns true if all assessment items are not valid and marked as new if `ignoreDelayed` set to true', () => {
      expect(
        getAssessmentItemsAreValid(
          state,
          {},
          {},
          rootGetters
        )({
          contentNodeId: 'content-node-id-4',
          ignoreDelayed: true,
        })
      ).toBe(true);
    });
  });
});
