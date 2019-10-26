import { prepareNodesForSave } from './utils';

describe('prepareNodesForSave', () => {
  it('returns nodes in a format accepted by API', () => {
    expect(
      prepareNodesForSave([
        {
          id: 'node-1',
          extra_fields: null,
        },
        {
          id: 'node-2',
          assessment_items: [
            {
              answers: [
                { answer: 'First answer', order: 1, correct: true },
                { answer: 'Second answer', order: 2, correct: false },
              ],
              hints: [
                { hint: 'Hint 1', order: 1 },
                { hint: 'Hint 2', order: 2 },
                { hint: 'Hint 3', order: 3 },
              ],
            },
            {
              answers: [{ answer: 'Answer', order: 1, correct: false }],
              hints: [],
            },
          ],
        },
      ])
    ).toEqual([
      {
        id: 'node-1',
        extra_fields: {},
        assessment_items: [],
      },
      {
        id: 'node-2',
        extra_fields: {},
        assessment_items: [
          {
            contentnode: 'node-2',
            answers:
              '[{"answer":"First answer","order":1,"correct":true},{"answer":"Second answer","order":2,"correct":false}]',
            hints:
              '[{"hint":"Hint 1","order":1},{"hint":"Hint 2","order":2},{"hint":"Hint 3","order":3}]',
          },
          {
            contentnode: 'node-2',
            answers: '[{"answer":"Answer","order":1,"correct":false}]',
            hints: '[]',
          },
        ],
      },
    ]);
  });
});
