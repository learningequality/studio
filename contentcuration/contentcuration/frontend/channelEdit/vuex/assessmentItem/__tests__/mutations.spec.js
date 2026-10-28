import { UPDATE_ASSESSMENTITEM, DELETE_ASSESSMENTITEM } from '../mutations';
import { AssessmentItemTypes } from 'shared/constants';

const item = (assessment_id, contentnode, extra = {}) => ({
  assessment_id,
  contentnode,
  type: AssessmentItemTypes.QTI,
  raw_data: `<xml>${assessment_id}</xml>`,
  ...extra,
});

describe('assessmentItem mutations', () => {
  let state;

  beforeEach(() => {
    state = {
      assessmentItemsMap: {
        'content-node-id-1': {
          'assessment-id-1': item('assessment-id-1', 'content-node-id-1'),
        },
        'content-node-id-2': {
          'assessment-id-2': item('assessment-id-2', 'content-node-id-2'),
        },
      },
    };
  });

  describe('UPDATE_ASSESSMENTITEM', () => {
    it('throws if the item cannot be identified', () => {
      expect(() => UPDATE_ASSESSMENTITEM(state, { contentnode: 'content-node-id-1' })).toThrow(
        ReferenceError,
      );
      expect(() => UPDATE_ASSESSMENTITEM(state, { assessment_id: 'assessment-id-9' })).toThrow(
        ReferenceError,
      );
    });

    it('adds an assessment item to a content node that has some already', () => {
      const newItem = item('assessment-id-3', 'content-node-id-1');

      UPDATE_ASSESSMENTITEM(state, newItem);

      expect(state.assessmentItemsMap['content-node-id-1']).toEqual({
        'assessment-id-1': item('assessment-id-1', 'content-node-id-1'),
        'assessment-id-3': newItem,
      });
    });

    it('adds an assessment item to a content node with none yet', () => {
      const newItem = item('assessment-id-4', 'content-node-id-3');

      UPDATE_ASSESSMENTITEM(state, newItem);

      expect(state.assessmentItemsMap['content-node-id-3']).toEqual({
        'assessment-id-4': newItem,
      });
    });

    it('merges the given fields into an existing assessment item', () => {
      UPDATE_ASSESSMENTITEM(state, {
        assessment_id: 'assessment-id-1',
        contentnode: 'content-node-id-1',
        raw_data: '<xml>edited</xml>',
      });

      expect(state.assessmentItemsMap['content-node-id-1']['assessment-id-1']).toEqual(
        item('assessment-id-1', 'content-node-id-1', { raw_data: '<xml>edited</xml>' }),
      );
    });
  });

  describe('DELETE_ASSESSMENTITEM', () => {
    it('removes an assessment item', () => {
      DELETE_ASSESSMENTITEM(state, {
        assessment_id: 'assessment-id-1',
        contentnode: 'content-node-id-1',
      });

      expect(state.assessmentItemsMap['content-node-id-1']).toEqual({});
    });
  });
});
