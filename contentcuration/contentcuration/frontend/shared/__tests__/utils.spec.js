import each from 'jest-each';

import { removeDuplicatePairs, isSuccessor } from '../utils';

describe('removeDuplicatePairs', () => {
  it('removes indentical pairs from an array', () => {
    expect(
      removeDuplicatePairs([
        ['food', 'chocolate'],
        ['drink', 'milk'],
        ['chocolate', 'food'],
        ['food', 'chocolate'],
      ])
    ).toEqual([
      ['drink', 'milk'],
      ['chocolate', 'food'],
      ['food', 'chocolate'],
    ]);
  });
});

describe('isSuccessor', () => {
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
  let graph;

  beforeEach(() => {
    graph = [
      ['A', 'B'],
      ['B', 'C'],
      ['A', 'D'],
      ['D', 'E'],
      ['E', 'G'],
      ['D', 'F'],
      ['F', 'G'],
      ['F', 'H'],
    ];
  });

  describe('with immediateOnly parameter set to true', () => {
    let immediateOnly;

    beforeEach(() => {
      immediateOnly = true;
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
    ]).it('returns true for an immediate successor', (rootVertex, vertexToCheck) => {
      expect(
        isSuccessor({
          rootVertex,
          vertexToCheck,
          graph,
          immediateOnly,
        })
      ).toBe(true);
    });

    each([
      ['A', 'C'],
      ['A', 'E'],
      ['A', 'F'],
      ['A', 'G'],
      ['A', 'H'],
      ['D', 'G'],
      ['D', 'H'],
    ]).it('returns false for a distant successor', (rootVertex, vertexToCheck) => {
      expect(
        isSuccessor({
          rootVertex,
          vertexToCheck,
          graph,
          immediateOnly,
        })
      ).toBe(false);
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
      (rootVertex, vertexToCheck) => {
        expect(
          isSuccessor({
            rootVertex,
            vertexToCheck,
            graph,
            immediateOnly,
          })
        ).toBe(false);
      }
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
      (rootVertex, vertexToCheck) => {
        expect(
          isSuccessor({
            rootVertex,
            vertexToCheck,
            graph,
            immediateOnly,
          })
        ).toBe(false);
      }
    );
  });

  describe('with immediateOnly parameter set to false', () => {
    let immediateOnly;

    beforeEach(() => {
      immediateOnly = false;
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
    ]).it('returns true for an immediate successor', (rootVertex, vertexToCheck) => {
      expect(
        isSuccessor({
          rootVertex,
          vertexToCheck,
          graph,
          immediateOnly,
        })
      ).toBe(true);
    });

    each([
      ['A', 'C'],
      ['A', 'E'],
      ['A', 'F'],
      ['A', 'G'],
      ['A', 'H'],
      ['D', 'G'],
      ['D', 'H'],
    ]).it('returns true for a distant successor', (rootVertex, vertexToCheck) => {
      expect(
        isSuccessor({
          rootVertex,
          vertexToCheck,
          graph,
          immediateOnly,
        })
      ).toBe(true);
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
      (rootVertex, vertexToCheck) => {
        expect(
          isSuccessor({
            rootVertex,
            vertexToCheck,
            graph,
            immediateOnly,
          })
        ).toBe(false);
      }
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
      (rootVertex, vertexToCheck) => {
        expect(
          isSuccessor({
            rootVertex,
            vertexToCheck,
            graph,
            immediateOnly,
          })
        ).toBe(false);
      }
    );
  });
});
