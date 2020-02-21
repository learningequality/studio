import {
  getContentNodeParents,
  getImmediatePreviousStepsList,
  getImmediateNextStepsList,
  getImmediateRelatedResourcesCount,
  isNextStep,
  isPreviousStep,
} from '../getters';

describe('contentNode getters', () => {
  describe('getContentNodeParents', () => {
    let state;

    beforeEach(() => {
      state = {
        treeNodesMap: {
          'id-elementary': {
            id: 'id-elementary',
            parent: 'id-english',
          },
          'id-literacy': {
            id: 'id-literacy',
            parent: 'id-elementary',
          },
          'id-reading': {
            id: 'id-reading',
            parent: 'id-literacy',
          },
          'id-english': {
            id: 'id-english',
            parent: null,
          },
        },
        contentNodesMap: {
          'id-elementary': {
            id: 'id-elementary',
            title: 'Elementary',
          },
          'id-literacy': {
            id: 'id-literacy',
            title: 'Literacy',
          },
          'id-reading': {
            id: 'id-reading',
            title: 'Reading',
          },
          'id-english': {
            id: 'id-english',
            title: 'English',
          },
        },
      };
    });

    it('returns an empty array if a content node not found', () => {
      expect(getContentNodeParents(state)('id-math')).toEqual([]);
    });

    it('returns an empty array if a content node has no parents', () => {
      expect(getContentNodeParents(state)('id-english')).toEqual([]);
    });

    it(`returns an array containing all parents of a content node
        sorted from the immediate parent to the most distant parent`, () => {
      expect(getContentNodeParents(state)('id-reading')).toEqual([
        {
          id: 'id-literacy',
          thumbnail_encoding: {},
          title: 'Literacy',
        },
        {
          id: 'id-elementary',
          thumbnail_encoding: {},
          title: 'Elementary',
        },
        {
          id: 'id-english',
          thumbnail_encoding: {},
          title: 'English',
        },
      ]);
    });
  });

  describe('', () => {
    let state;

    beforeEach(() => {
      state = {
        contentNodesMap: {
          'id-science': {
            id: 'id-science',
            title: 'Science',
            kind: 'topic',
            parent: null,
          },
          'id-literacy': {
            id: 'id-literacy',
            title: 'Literacy',
            kind: 'topic',
            parent: null,
          },
          'id-alphabet': {
            id: 'id-alphabet',
            title: 'Alphabet',
            kind: 'document',
            parent: 'id-literacy',
          },
          'id-reading': {
            id: 'id-reading',
            title: 'Reading',
            kind: 'document',
            parent: 'id-literacy',
          },
          'id-counting': {
            id: 'id-counting',
            title: 'Counting',
            kind: 'video',
            parent: 'id-science',
          },
          'id-integrals': {
            id: 'id-integrals',
            title: 'Integrals',
            kind: 'document',
            parent: 'id-science',
          },
          'id-geography': {
            id: 'id-geography',
            title: 'Geography',
            kind: 'html5',
            parent: 'id-science',
          },
          'id-philosophy': {
            id: 'id-philosophy',
            title: 'Philosophy',
            kind: 'document',
            parent: 'id-arts',
          },
        },
        nextStepsMap: [
          ['id-alphabet', 'id-reading'],
          ['id-reading', 'id-counting'],
          ['id-reading', 'id-geography'],
          ['id-counting', 'id-integrals'],
        ],
      };
    });

    describe('getImmediatePreviousStepsList', () => {
      it('returns a list of all immediate previous steps of a node', () => {
        expect(getImmediatePreviousStepsList(state)('id-reading')).toEqual([
          {
            id: 'id-alphabet',
            title: 'Alphabet',
            kind: 'document',
            parentTitle: 'Literacy',
          },
        ]);
      });
    });

    describe('getImmediateNextStepsList', () => {
      it('returns a list of all immediate next steps of a node', () => {
        expect(getImmediateNextStepsList(state)('id-reading')).toEqual([
          {
            id: 'id-counting',
            title: 'Counting',
            kind: 'video',
            parentTitle: 'Science',
          },
          {
            id: 'id-geography',
            title: 'Geography',
            kind: 'html5',
            parentTitle: 'Science',
          },
        ]);
      });
    });
  });

  describe('getImmediateRelatedResourcesCount', () => {
    let state;

    beforeEach(() => {
      state = {
        nextStepsMap: [
          ['id-reading', 'id-chemistry'],
          ['id-chemistry', 'id-biology'],
          ['id-chemistry', 'id-physics'],
        ],
      };
    });

    it('returns 0 if neither previous nor next step found', () => {
      expect(getImmediateRelatedResourcesCount(state)('id-literacy')).toBe(0);
    });

    it('returns a correct count of related resources', () => {
      expect(getImmediateRelatedResourcesCount(state)('id-chemistry')).toBe(3);
    });
  });

  describe('isNextStep', () => {
    let state;

    beforeEach(() => {
      state = {
        nextStepsMap: [
          ['id-reading', 'id-counting'],
          ['id-counting', 'id-integrals'],
          ['id-integrals', 'id-physics'],
          ['id-physics', 'id-astronomy'],
          ['id-reading', 'id-history'],
          ['id-history', 'id-philosophy'],
        ],
      };
    });

    describe('when next steps map is empty', () => {
      it('returns false', () => {
        const state = {
          nextStepsMap: [],
        };

        expect(
          isNextStep(state)({
            rootNodeId: 'id-reading',
            nodeId: 'id-astromomy',
          })
        ).toBe(false);
      });
    });

    describe('for a node that is a next step', () => {
      it('returns true', () => {
        expect(
          isNextStep(state)({
            rootNodeId: 'id-reading',
            nodeId: 'id-astronomy',
          })
        ).toBe(true);
      });
    });

    describe('for a node that is not a next step', () => {
      it('returns false', () => {
        expect(
          isNextStep(state)({
            rootNodeId: 'id-counting',
            nodeId: 'id-history',
          })
        ).toBe(false);
      });
    });
  });

  describe('isPreviousStep', () => {
    let state;

    beforeEach(() => {
      state = {
        nextStepsMap: [
          ['id-reading', 'id-counting'],
          ['id-counting', 'id-integrals'],
          ['id-integrals', 'id-physics'],
          ['id-physics', 'id-astronomy'],
          ['id-reading', 'id-history'],
          ['id-history', 'id-philosophy'],
        ],
      };
    });

    describe('when next steps map is empty', () => {
      it('returns false', () => {
        const state = {
          nextStepsMap: [],
        };

        expect(
          isPreviousStep(state)({
            rootNodeId: 'id-reading',
            nodeId: 'id-astromomy',
          })
        ).toBe(false);
      });
    });

    describe('for a node that is a previous step', () => {
      it('returns true', () => {
        expect(
          isPreviousStep(state)({
            rootNodeId: 'id-philosophy',
            nodeId: 'id-reading',
          })
        ).toBe(true);
      });
    });

    describe('for a node that is not a previous step', () => {
      it('returns false', () => {
        expect(
          isPreviousStep(state)({
            rootNodeId: 'id-reading',
            nodeId: 'id-philosophy',
          })
        ).toBe(false);
      });
    });
  });
});
