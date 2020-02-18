import { getImmediatePreviousStepsList, getImmediateNextStepsList } from '../getters';

describe('contentNode getters', () => {
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
});
