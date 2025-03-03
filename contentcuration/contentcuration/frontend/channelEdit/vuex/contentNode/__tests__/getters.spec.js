import each from 'jest-each';
import { getImmediateRelatedResourcesCount, isNextStep, isPreviousStep, tags } from '../getters';
import { factory } from '../../../store';

describe('contentNode getters', () => {
  describe('tags', () => {
    it('should render a uniq list of all tags in the map', () => {
      const state = {
        // English -> Elementary -> Literacy -> Reading
        contentNodesMap: {
          'id-elementary': {
            id: 'id-elementary',
            title: 'Elementary',
            parent: 'id-english',
            tags: {
              notatag: true,
              yesatest: true,
            },
          },
          'id-literacy': {
            id: 'id-literacy',
            title: 'Literacy',
            parent: 'id-elementary',
            tags: {
              notatag: true,
              yesatest: true,
            },
          },
          'id-reading': {
            id: 'id-reading',
            title: 'Reading',
            parent: 'id-literacy',
            tags: {
              notatag: true,
              yesatest: true,
            },
          },
          'id-english': {
            id: 'id-english',
            title: 'English',
            tags: {
              notatag: true,
              yesatest: true,
            },
          },
        },
      };
      expect(tags(state)).toEqual(['notatag', 'yesatest']);
    });
    it('should render an empty list when no tags are specified', () => {
      const state = {
        // English -> Elementary -> Literacy -> Reading
        contentNodesMap: {
          'id-elementary': {
            id: 'id-elementary',
            title: 'Elementary',
            parent: 'id-english',
          },
          'id-literacy': {
            id: 'id-literacy',
            title: 'Literacy',
            parent: 'id-elementary',
          },
          'id-reading': {
            id: 'id-reading',
            title: 'Reading',
            parent: 'id-literacy',
          },
          'id-english': {
            id: 'id-english',
            title: 'English',
          },
        },
      };
      expect(tags(state)).toEqual([]);
    });
  });
  describe('getContentNodeAncestors', () => {
    let store;
    beforeEach(() => {
      store = factory();
      store.state.contentNode = {
        // English -> Elementary -> Literacy -> Reading
        contentNodesMap: {
          'id-elementary': {
            id: 'id-elementary',
            title: 'Elementary',
            parent: 'id-english',
          },
          'id-literacy': {
            id: 'id-literacy',
            title: 'Literacy',
            parent: 'id-elementary',
          },
          'id-reading': {
            id: 'id-reading',
            title: 'Reading',
            parent: 'id-literacy',
          },
          'id-english': {
            id: 'id-english',
            title: 'English',
          },
        },
      };
    });

    it('returns an empty array if a content node not found', () => {
      expect(store.getters['contentNode/getContentNodeAncestors']('id-math')).toEqual([]);
    });

    it(`returns an array containing a content node and all its parents
        sorted from the most distant parent to the node itself`, () => {
      expect(store.getters['contentNode/getContentNodeAncestors']('id-literacy', true)).toEqual([
        {
          id: 'id-english',
          thumbnail_encoding: {},
          tags: [],
          title: 'English',
        },
        {
          id: 'id-elementary',
          thumbnail_encoding: {},
          tags: [],
          title: 'Elementary',
          parent: 'id-english',
        },
        {
          id: 'id-literacy',
          thumbnail_encoding: {},
          tags: [],
          title: 'Literacy',
          parent: 'id-elementary',
        },
      ]);
    });

    it(`returns an array containing a content node and all its parents
        sorted from the most distant parent to the node's parent`, () => {
      expect(store.getters['contentNode/getContentNodeAncestors']('id-literacy', false)).toEqual([
        {
          id: 'id-english',
          thumbnail_encoding: {},
          tags: [],
          title: 'English',
        },
        {
          id: 'id-elementary',
          thumbnail_encoding: {},
          tags: [],
          title: 'Elementary',
          parent: 'id-english',
        },
      ]);
    });
  });

  describe('prerequisite getters', () => {
    let store;
    beforeEach(() => {
      store = factory();
      store.state.contentNode = {
        contentNodesMap: {
          'id-science': {
            id: 'id-science',
            title: 'Science',
            kind: 'topic',
            parent: 'id-channel',
          },
          'id-literacy': {
            id: 'id-literacy',
            title: 'Literacy',
            kind: 'topic',
            parent: 'id-channel',
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
        nextStepsMap: {
          'id-alphabet': { 'id-reading': true },
          'id-reading': { 'id-counting': true, 'id-geography': true },
          'id-counting': { 'id-integrals': true },
        },
        previousStepsMap: {
          'id-reading': { 'id-alphabet': true },
          'id-counting': { 'id-reading': true },
          'id-geography': { 'id-reading': true },
          'id-integrals': { 'id-counting': true },
        },
      };
    });

    describe('getImmediatePreviousStepsList', () => {
      it('returns a list of all immediate previous steps of a node', () => {
        expect(store.getters['contentNode/getImmediatePreviousStepsList']('id-reading')).toEqual([
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
        expect(store.getters['contentNode/getImmediateNextStepsList']('id-reading')).toEqual([
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
        nextStepsMap: {
          'id-reading': { 'id-chemistry': true },
          'id-chemistry': { 'id-biology': true, 'id-physics': true },
        },
        previousStepsMap: {
          'id-chemistry': { 'id-reading': true },
          'id-biology': { 'id-chemistry': true },
          'id-physics': { 'id-chemistry': true },
        },
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
        nextStepsMap: {
          'id-reading': { 'id-counting': true, 'id-history': true },
          'id-counting': { 'id-integrals': true },
          'id-integrals': { 'id-physics': true },
          'id-physics': { 'id-astronomy': true },
          'id-history': { 'id-philosophy': true },
        },
        previousStepsMap: {
          'id-counting': { 'id-reading': true },
          'id-integrals': { 'id-counting': true },
          'id-physics': { 'id-integrals': true },
          'id-astronomy': { 'id-physics': true },
          'id-history': { 'id-reading': true },
          'id-philosophy': { 'id-history': true },
        },
      };
    });

    describe('when next steps map is empty', () => {
      it('returns false', () => {
        const state = {
          nextStepsMap: {},
          previousStepsMap: {},
        };

        expect(
          isNextStep(state)({
            rootNodeId: 'id-reading',
            nodeId: 'id-astromomy',
          }),
        ).toBe(false);
      });
    });

    describe('for a node that is a next step', () => {
      it('returns true', () => {
        expect(
          isNextStep(state)({
            rootNodeId: 'id-reading',
            nodeId: 'id-astronomy',
          }),
        ).toBe(true);
      });
    });

    describe('for a node that is not a next step', () => {
      it('returns false', () => {
        expect(
          isNextStep(state)({
            rootNodeId: 'id-counting',
            nodeId: 'id-history',
          }),
        ).toBe(false);
      });
    });
    describe('for complex graphs', () => {
      /**
       *       A → → → D → → → E
       *       ↓         ↘       ↘
       *       ↓          ↘       ↘
       *       ↓           ↘       ↘
       *       B → → C      F → → →  G
       *                    ↓
       *                    ↓
       *                    ↓
       *                    H
       */

      beforeEach(() => {
        state = {
          nextStepsMap: {
            A: { B: true, D: true },
            B: { C: true },
            D: { E: true, F: true },
            E: { G: true },
            F: { G: true, H: true },
          },
          previousStepsMap: {
            B: { A: true },
            C: { B: true },
            D: { A: true },
            E: { D: true },
            G: { E: true, F: true },
            F: { D: true },
            H: { F: true },
          },
        };
      });

      each([
        ['A', 'B'],
        ['A', 'D'],
        ['B', 'C'],
        ['D', 'E'],
        ['D', 'F'],
        ['E', 'G'],
        ['F', 'G'],
        ['F', 'H'],
      ]).it('returns true for an immediate successor', (rootNodeId, nodeId) => {
        expect(isNextStep(state)({ rootNodeId, nodeId })).toBe(true);
      });

      each([
        ['A', 'C'],
        ['A', 'E'],
        ['A', 'F'],
        ['A', 'G'],
        ['A', 'H'],
        ['D', 'G'],
        ['D', 'H'],
      ]).it('returns true for a distant successor', (rootNodeId, nodeId) => {
        expect(isNextStep(state)({ rootNodeId, nodeId })).toBe(true);
      });

      each([
        ['B', 'A'],
        ['B', 'D'],
        ['B', 'E'],
        ['B', 'F'],
        ['B', 'G'],
        ['B', 'H'],
        ['C', 'A'],
        ['C', 'B'],
        ['C', 'D'],
        ['C', 'E'],
        ['C', 'F'],
        ['C', 'G'],
        ['C', 'H'],
        ['D', 'A'],
        ['D', 'B'],
        ['D', 'C'],
        ['E', 'A'],
        ['E', 'B'],
        ['E', 'C'],
        ['E', 'D'],
        ['E', 'F'],
        ['E', 'H'],
        ['F', 'A'],
        ['F', 'B'],
        ['F', 'C'],
        ['F', 'D'],
        ['F', 'E'],
        ['G', 'A'],
        ['G', 'B'],
        ['G', 'C'],
        ['G', 'D'],
        ['G', 'E'],
        ['G', 'F'],
        ['G', 'H'],
        ['H', 'A'],
        ['H', 'B'],
        ['H', 'C'],
        ['H', 'D'],
        ['H', 'E'],
        ['H', 'F'],
        ['H', 'G'],
      ]).it(
        'returns false for a vertex that is neither immediate nor distant successor',
        (rootNodeId, nodeId) => {
          expect(isNextStep(state)({ rootNodeId, nodeId })).toBe(false);
        },
      );

      each([
        ['A', 'A'],
        ['B', 'B'],
        ['C', 'C'],
        ['D', 'D'],
        ['E', 'E'],
        ['F', 'F'],
        ['G', 'G'],
        ['H', 'H'],
      ]).it(
        'returns false when checking if a root note is a successor node',
        (rootNodeId, nodeId) => {
          expect(isNextStep(state)({ rootNodeId, nodeId })).toBe(false);
        },
      );
    });
    describe('for cyclic graphs', () => {
      /**
       *       A → → → D → → → E
       *       ↓↖        ↘       ↘
       *       ↓  ↖       ↘       ↘
       *       ↓    ↖      ↘       ↘
       *       B → → C      F → → →  G
       *                    ↓
       *                    ↓
       *                    ↓
       *                    H
       */

      beforeEach(() => {
        state = {
          nextStepsMap: {
            A: { B: true, D: true },
            B: { C: true },
            C: { A: true },
            D: { E: true, F: true },
            E: { G: true },
            F: { G: true, H: true },
          },
          previousStepsMap: {
            A: { C: true },
            B: { A: true },
            C: { B: true },
            D: { A: true },
            E: { D: true },
            G: { E: true, F: true },
            F: { D: true },
            H: { F: true },
          },
        };
      });

      each([
        ['A', 'B'],
        ['A', 'D'],
        ['B', 'C'],
        ['C', 'A'],
        ['D', 'E'],
        ['D', 'F'],
        ['E', 'G'],
        ['F', 'G'],
        ['F', 'H'],
      ]).it('returns true for an immediate successor', (rootNodeId, nodeId) => {
        expect(isNextStep(state)({ rootNodeId, nodeId })).toBe(true);
      });

      each([
        ['A', 'C'],
        ['A', 'E'],
        ['A', 'F'],
        ['A', 'G'],
        ['A', 'H'],
        ['B', 'A'],
        ['B', 'D'],
        ['B', 'E'],
        ['B', 'F'],
        ['B', 'G'],
        ['B', 'H'],
        ['C', 'B'],
        ['C', 'D'],
        ['C', 'E'],
        ['C', 'F'],
        ['C', 'G'],
        ['C', 'H'],
        ['D', 'G'],
        ['D', 'H'],
      ]).it('returns true for a distant successor', (rootNodeId, nodeId) => {
        expect(isNextStep(state)({ rootNodeId, nodeId })).toBe(true);
      });

      each([
        ['D', 'A'],
        ['D', 'B'],
        ['D', 'C'],
        ['E', 'A'],
        ['E', 'B'],
        ['E', 'C'],
        ['E', 'D'],
        ['E', 'F'],
        ['E', 'H'],
        ['F', 'A'],
        ['F', 'B'],
        ['F', 'C'],
        ['F', 'D'],
        ['F', 'E'],
        ['G', 'A'],
        ['G', 'B'],
        ['G', 'C'],
        ['G', 'D'],
        ['G', 'E'],
        ['G', 'F'],
        ['G', 'H'],
        ['H', 'A'],
        ['H', 'B'],
        ['H', 'C'],
        ['H', 'D'],
        ['H', 'E'],
        ['H', 'F'],
        ['H', 'G'],
      ]).it(
        'returns false for a vertex that is neither immediate nor distant successor',
        (rootNodeId, nodeId) => {
          expect(isNextStep(state)({ rootNodeId, nodeId })).toBe(false);
        },
      );

      each([
        ['A', 'A'],
        ['B', 'B'],
        ['C', 'C'],
        ['D', 'D'],
        ['E', 'E'],
        ['F', 'F'],
        ['G', 'G'],
        ['H', 'H'],
      ]).it(
        'returns false when checking if a root node is a successor node',
        (rootNodeId, nodeId) => {
          expect(isNextStep(state)({ rootNodeId, nodeId })).toBe(false);
        },
      );
    });
  });

  describe('isPreviousStep', () => {
    let state;

    beforeEach(() => {
      state = {
        nextStepsMap: {
          'id-reading': { 'id-counting': true, 'id-history': true },
          'id-counting': { 'id-integrals': true },
          'id-integrals': { 'id-physics': true },
          'id-physics': { 'id-astronomy': true },
          'id-history': { 'id-philosophy': true },
        },
        previousStepsMap: {
          'id-counting': { 'id-reading': true },
          'id-integrals': { 'id-counting': true },
          'id-physics': { 'id-integrals': true },
          'id-astronomy': { 'id-physics': true },
          'id-history': { 'id-reading': true },
          'id-philosophy': { 'id-history': true },
        },
      };
    });

    describe('when next steps map is empty', () => {
      it('returns false', () => {
        const state = {
          nextStepsMap: {},
          previousStepsMap: {},
        };

        expect(
          isPreviousStep(state)({
            rootNodeId: 'id-reading',
            nodeId: 'id-astromomy',
          }),
        ).toBe(false);
      });
    });

    describe('for a node that is a previous step', () => {
      it('returns true', () => {
        expect(
          isPreviousStep(state)({
            rootNodeId: 'id-philosophy',
            nodeId: 'id-reading',
          }),
        ).toBe(true);
      });
    });

    describe('for a node that is not a previous step', () => {
      it('returns false', () => {
        expect(
          isPreviousStep(state)({
            rootNodeId: 'id-reading',
            nodeId: 'id-philosophy',
          }),
        ).toBe(false);
      });
    });
  });
});
