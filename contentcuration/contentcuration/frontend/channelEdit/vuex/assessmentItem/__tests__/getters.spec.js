import {
  getAssessmentItems,
  getAssessmentItemsCount,
  getAssessmentItemsErrors,
  getInvalidAssessmentItemsCount,
  getAssessmentItemsAreValid,
} from '../getters';
import { AssessmentItemTypes, ContentModalities } from 'shared/constants';
import { ValidationError } from 'shared/views/QTIEditor/constants';
import {
  VALID_CHOICE_ITEM_DOCUMENT,
  CHOICE_ITEM_DOCUMENT_NO_PROMPT,
  CHOICE_ITEM_DOCUMENT_NO_CORRECT_ANSWER,
  FREE_RESPONSE_ITEM_DOCUMENT,
} from 'shared/views/QTIEditor/utils/testingFixtures';

const item = (assessment_id, contentnode, raw_data, extra = {}) => ({
  assessment_id,
  contentnode,
  type: AssessmentItemTypes.QTI,
  raw_data,
  ...extra,
});

describe('assessmentItem getters', () => {
  let state;
  let rootGetters;

  beforeEach(() => {
    state = {
      assessmentItemsMap: {
        'content-node-id-1': {
          'assessment-id-1': item(
            'assessment-id-1',
            'content-node-id-1',
            VALID_CHOICE_ITEM_DOCUMENT,
          ),
        },
        'content-node-id-2': {
          'assessment-id-2': item(
            'assessment-id-2',
            'content-node-id-2',
            CHOICE_ITEM_DOCUMENT_NO_PROMPT,
            { order: 1 },
          ),
          'assessment-id-3': item(
            'assessment-id-3',
            'content-node-id-2',
            CHOICE_ITEM_DOCUMENT_NO_CORRECT_ANSWER,
            { order: 2 },
          ),
        },
        'content-node-id-3': {
          'assessment-id-4': item(
            'assessment-id-4',
            'content-node-id-3',
            CHOICE_ITEM_DOCUMENT_NO_PROMPT,
          ),
          'assessment-id-5': item(
            'assessment-id-5',
            'content-node-id-3',
            CHOICE_ITEM_DOCUMENT_NO_PROMPT,
          ),
        },
        'content-node-id-survey': {
          'assessment-id-6': item(
            'assessment-id-6',
            'content-node-id-survey',
            FREE_RESPONSE_ITEM_DOCUMENT,
          ),
        },
      },
    };

    rootGetters = {
      'contentNode/getContentNode': id => ({
        id,
        kind: 'exercise',
        extra_fields:
          id === 'content-node-id-survey'
            ? { options: { modality: ContentModalities.SURVEY } }
            : {},
      }),
    };
  });

  const errorsFor = (contentNodeId, options = {}) =>
    getAssessmentItemsErrors(state, {}, {}, rootGetters)({ contentNodeId, ...options });

  describe('getAssessmentItems', () => {
    it('returns an empty array if a content node not found', () => {
      expect(getAssessmentItems(state)('content-node-id-4')).toEqual([]);
    });

    it('returns an array of assessment items belonging to a content node', () => {
      expect(getAssessmentItems(state)('content-node-id-2').map(i => i.assessment_id)).toEqual([
        'assessment-id-2',
        'assessment-id-3',
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
      expect(errorsFor('content-node-id-2')).toEqual({
        'assessment-id-2': [{ code: ValidationError.PROMPT_REQUIRED }],
        'assessment-id-3': [{ code: ValidationError.NO_CORRECT_ANSWER }],
      });
    });

    it('rejects a free-response question on a node that is not a survey', () => {
      state.assessmentItemsMap['content-node-id-1']['assessment-id-1'].raw_data =
        FREE_RESPONSE_ITEM_DOCUMENT;

      expect(errorsFor('content-node-id-1')['assessment-id-1']).toContainEqual({
        code: ValidationError.FREE_RESPONSE_NOT_ALLOWED,
      });
    });

    it('accepts a free-response question on a survey', () => {
      expect(errorsFor('content-node-id-survey')).toEqual({ 'assessment-id-6': [] });
    });
  });

  describe('getInvalidAssessmentItemsCount', () => {
    it('returns a correct number of invalid assessment items of a content node', () => {
      expect(
        getInvalidAssessmentItemsCount(
          state,
          {},
          {},
          rootGetters,
        )({ contentNodeId: 'content-node-id-2' }),
      ).toBe(2);
    });

    it('counts an item the author has only just added like any other', () => {
      state.assessmentItemsMap['content-node-id-3'] = {
        'assessment-id-7': item('assessment-id-7', 'content-node-id-3', ''),
      };

      expect(
        getInvalidAssessmentItemsCount(
          state,
          {},
          {},
          rootGetters,
        )({ contentNodeId: 'content-node-id-3' }),
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
          rootGetters,
        )({ contentNodeId: 'content-node-id-1' }),
      ).toBe(true);
    });

    it('returns false if all assessment items of a content node are not valid', () => {
      expect(
        getAssessmentItemsAreValid(
          state,
          {},
          {},
          rootGetters,
        )({ contentNodeId: 'content-node-id-2' }),
      ).toBe(false);
    });

    it('returns false when every assessment item of a content node is invalid', () => {
      expect(
        getAssessmentItemsAreValid(
          state,
          {},
          {},
          rootGetters,
        )({ contentNodeId: 'content-node-id-3' }),
      ).toBe(false);
    });
  });
});
