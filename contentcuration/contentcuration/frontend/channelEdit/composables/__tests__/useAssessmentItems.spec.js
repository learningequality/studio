import { Store } from 'vuex';
import VueRouter from 'vue-router';
import { render } from '@testing-library/vue';
import useAssessmentItems from '../useAssessmentItems';
import { AssessmentItemTypes, ContentModalities } from 'shared/constants';

const NODE_ID = 'node-1';

const item = (assessment_id, order, raw_data = `<xml>${assessment_id}</xml>`) => ({
  assessment_id,
  contentnode: NODE_ID,
  type: AssessmentItemTypes.QTI,
  order,
  raw_data,
});

/**
 * Renders a component that does nothing but run the composable, and returns it alongside
 * the actions the composable dispatched, in the order it dispatched them.
 */
function setup(storedItems, { modality = null } = {}) {
  const dispatched = [];
  const record = name => (context, payload) => dispatched.push([name, payload]);

  const store = new Store({
    modules: {
      contentNode: {
        namespaced: true,
        getters: {
          getContentNode: () => () => ({ extra_fields: { options: { modality } } }),
        },
      },
      assessmentItem: {
        namespaced: true,
        getters: {
          getAssessmentItems: () => () => storedItems,
          getInvalidAssessmentItemsCount: () => () => 0,
        },
        actions: {
          updateAssessmentItems: record('updateAssessmentItems'),
          updateAssessmentItem: record('updateAssessmentItem'),
          addAssessmentItem: record('addAssessmentItem'),
          deleteAssessmentItem: record('deleteAssessmentItem'),
        },
      },
    },
  });

  let composable;
  render(
    {
      template: '<div />',
      setup() {
        composable = useAssessmentItems(NODE_ID);
      },
    },
    { store, routes: new VueRouter() },
  );

  return { composable, dispatched };
}

describe('useAssessmentItems', () => {
  describe('allowFreeResponse', () => {
    it('accepts a question with no correct answer on a survey', () => {
      const { composable } = setup([], { modality: ContentModalities.SURVEY });

      expect(composable.allowFreeResponse.value).toBe(true);
    });

    it('does not accept one on an exercise, whose questions are scored', () => {
      const { composable } = setup([]);

      expect(composable.allowFreeResponse.value).toBe(false);
    });
  });

  it('dispatches nothing when the list is unchanged', async () => {
    const items = [item('a', 0), item('b', 1)];
    const { composable, dispatched } = setup(items);

    await composable.applyUpdate([...items]);

    expect(dispatched).toEqual([]);
  });

  it('updates only the question whose content changed', async () => {
    const { composable, dispatched } = setup([item('a', 0), item('b', 1)]);

    await composable.applyUpdate([item('a', 0), item('b', 1, '<xml>edited</xml>')]);

    expect(dispatched).toEqual([
      [
        'updateAssessmentItem',
        { contentnode: NODE_ID, assessment_id: 'b', raw_data: '<xml>edited</xml>' },
      ],
    ]);
  });

  it('adds a new question with its position as order, and nothing else', async () => {
    const { composable, dispatched } = setup([item('a', 0)]);
    const added = {
      assessment_id: 'new',
      type: AssessmentItemTypes.QTI,
      raw_data: '<xml>new</xml>',
    };

    await composable.applyUpdate([item('a', 0), added]);

    expect(dispatched).toEqual([
      ['addAssessmentItem', { contentnode: NODE_ID, ...added, order: 1 }],
    ]);
  });

  it('reorders the questions that moved before adding a new one between them', async () => {
    const { composable, dispatched } = setup([item('a', 0), item('b', 1)]);
    const added = {
      assessment_id: 'new',
      type: AssessmentItemTypes.QTI,
      raw_data: '<xml>new</xml>',
    };

    await composable.applyUpdate([item('a', 0), added, item('b', 1)]);

    expect(dispatched.map(([name]) => name)).toEqual([
      'updateAssessmentItems',
      'addAssessmentItem',
    ]);
    expect(dispatched[0][1]).toEqual([{ contentnode: NODE_ID, assessment_id: 'b', order: 2 }]);
    expect(dispatched[1][1].order).toBe(1);
  });

  it('reorders the remaining questions before deleting one', async () => {
    const { composable, dispatched } = setup([item('a', 0), item('b', 1), item('c', 2)]);

    await composable.applyUpdate([item('a', 0), item('c', 2)]);

    expect(dispatched).toEqual([
      ['updateAssessmentItems', [{ contentnode: NODE_ID, assessment_id: 'c', order: 1 }]],
      ['deleteAssessmentItem', { contentnode: NODE_ID, assessment_id: 'b' }],
    ]);
  });

  it('reorders swapped questions', async () => {
    const { composable, dispatched } = setup([item('a', 0), item('b', 1)]);

    await composable.applyUpdate([item('b', 1), item('a', 0)]);

    expect(dispatched).toEqual([
      [
        'updateAssessmentItems',
        [
          { contentnode: NODE_ID, assessment_id: 'b', order: 0 },
          { contentnode: NODE_ID, assessment_id: 'a', order: 1 },
        ],
      ],
    ]);
  });
});
