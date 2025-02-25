import { nextTick } from 'vue';
import { SAVE_NEXT_STEPS, REMOVE_PREVIOUS_STEP, ADD_PREVIOUS_STEP } from '../mutations';
import { factory } from '../../../store';

describe('contentNode mutations', () => {
  describe('SAVE_NEXT_STEPS', () => {
    let state, mappings;

    beforeEach(() => {
      mappings = [
        { target_node: 'id-integrals', prerequisite: 'id-elementary-math' },
        { target_node: 'id-elementary-math', prerequisite: 'id-reading' },
        { target_node: 'id-physics', prerequisite: 'id-integrals' },
        { target_node: 'id-astronomy', prerequisite: 'id-physics' },
        { target_node: 'id-spaceships-contruction', prerequisite: 'id-astronomy' },
        { target_node: 'id-chemistry', prerequisite: 'id-integrals' },
        { target_node: 'id-lab', prerequisite: 'id-chemistry' },
      ];
    });

    it(`should save the complete chain of previous/next steps to vuex state`, () => {
      state = {
        nextStepsMap: {},
        previousStepsMap: {},
      };

      SAVE_NEXT_STEPS(state, { mappings });

      const maps = {
        nextStepsMap: {
          'id-integrals': { 'id-physics': true, 'id-chemistry': true },
          'id-physics': { 'id-astronomy': true },
          'id-astronomy': { 'id-spaceships-contruction': true },
          'id-chemistry': { 'id-lab': true },
          'id-elementary-math': { 'id-integrals': true },
          'id-reading': { 'id-elementary-math': true },
        },
        previousStepsMap: {
          'id-physics': { 'id-integrals': true },
          'id-astronomy': { 'id-physics': true },
          'id-spaceships-contruction': { 'id-astronomy': true },
          'id-chemistry': { 'id-integrals': true },
          'id-lab': { 'id-chemistry': true },
          'id-integrals': { 'id-elementary-math': true },
          'id-elementary-math': { 'id-reading': true },
        },
      };

      expect(state.nextStepsMap).toEqual(maps.nextStepsMap);
      expect(state.previousStepsMap).toEqual(maps.previousStepsMap);
    });

    it("shouldn't save duplicates", () => {
      state = {
        nextStepsMap: {
          'id-physics': { 'id-astronomy': true },
          'id-reading': { 'id-philosophy': true },
          'id-chemistry': { 'id-lab': true },
        },
        previousStepsMap: {
          'id-astronomy': { 'id-physics': true },
          'id-philosophy': { 'id-reading': true },
          'id-lab': { 'id-chemistry': true },
        },
      };

      SAVE_NEXT_STEPS(state, { mappings });

      const maps = {
        nextStepsMap: {
          'id-reading': { 'id-philosophy': true, 'id-elementary-math': true },
          'id-integrals': { 'id-physics': true, 'id-chemistry': true },
          'id-physics': { 'id-astronomy': true },
          'id-astronomy': { 'id-spaceships-contruction': true },
          'id-chemistry': { 'id-lab': true },
          'id-elementary-math': { 'id-integrals': true },
        },
        previousStepsMap: {
          'id-philosophy': { 'id-reading': true },
          'id-physics': { 'id-integrals': true },
          'id-astronomy': { 'id-physics': true },
          'id-spaceships-contruction': { 'id-astronomy': true },
          'id-chemistry': { 'id-integrals': true },
          'id-lab': { 'id-chemistry': true },
          'id-integrals': { 'id-elementary-math': true },
          'id-elementary-math': { 'id-reading': true },
        },
      };
      expect(state.nextStepsMap).toEqual(maps.nextStepsMap);
      expect(state.previousStepsMap).toEqual(maps.previousStepsMap);
    });
  });

  describe('REMOVE_PREVIOUS_STEP', () => {
    let state;

    it('removes a corresponding entry from vuex state', () => {
      state = {
        nextStepsMap: {
          'id-integrals': { 'id-physics': true },
          'id-reading': { 'id-physics': true },
          'id-physics': { 'id-astronomy': true },
        },
        previousStepsMap: {
          'id-physics': { 'id-integrals': true, 'id-reading': true },
          'id-astronomy': { 'id-physics': true },
        },
      };

      REMOVE_PREVIOUS_STEP(state, {
        target_node: 'id-physics',
        prerequisite: 'id-integrals',
      });

      const maps = {
        nextStepsMap: {
          'id-reading': { 'id-physics': true },
          'id-physics': { 'id-astronomy': true },
        },
        previousStepsMap: {
          'id-physics': { 'id-reading': true },
          'id-astronomy': { 'id-physics': true },
        },
      };
      expect(state.nextStepsMap).toEqual(maps.nextStepsMap);
      expect(state.previousStepsMap).toEqual(maps.previousStepsMap);
    });
  });

  describe('ADD_PREVIOUS_STEP', () => {
    let state;

    beforeEach(() => {
      state = {
        nextStepsMap: {
          'id-integrals': { 'id-physics': true },
          'id-reading': { 'id-physics': true },
          'id-physics': { 'id-astronomy': true },
        },
        previousStepsMap: {
          'id-physics': { 'id-integrals': true, 'id-reading': true },
          'id-astronomy': { 'id-physics': true },
        },
      };
    });

    it("doesn't add an entry to vuex state if it's there already", () => {
      ADD_PREVIOUS_STEP(state, {
        target_node: 'id-physics',
        prerequisite: 'id-reading',
      });

      const maps = {
        nextStepsMap: {
          'id-integrals': { 'id-physics': true },
          'id-reading': { 'id-physics': true },
          'id-physics': { 'id-astronomy': true },
        },
        previousStepsMap: {
          'id-physics': { 'id-integrals': true, 'id-reading': true },
          'id-astronomy': { 'id-physics': true },
        },
      };
      expect(state.nextStepsMap).toEqual(maps.nextStepsMap);
      expect(state.previousStepsMap).toEqual(maps.previousStepsMap);
    });

    it('adds an entry to vuex state', () => {
      ADD_PREVIOUS_STEP(state, {
        target_node: 'id-spaceships-engineering',
        prerequisite: 'id-astronomy',
      });

      const maps = {
        nextStepsMap: {
          'id-integrals': { 'id-physics': true },
          'id-reading': { 'id-physics': true },
          'id-physics': { 'id-astronomy': true },
          'id-astronomy': { 'id-spaceships-engineering': true },
        },
        previousStepsMap: {
          'id-physics': { 'id-integrals': true, 'id-reading': true },
          'id-astronomy': { 'id-physics': true },
          'id-spaceships-engineering': { 'id-astronomy': true },
        },
      };
      expect(state.nextStepsMap).toEqual(maps.nextStepsMap);
      expect(state.previousStepsMap).toEqual(maps.previousStepsMap);
    });
  });
  describe('UPDATE_CONTENTNODE_FROM_INDEXEDDB', () => {
    it('should ensure that nested object properties are reactively set', async () => {
      const store = factory();
      store.commit('contentNode/ADD_CONTENTNODE', { id: 'test', extra_fields: null });
      await nextTick();
      const spy = jest.fn();
      store.watch(state => {
        const node = state.contentNode.contentNodesMap.test;
        const value =
          node &&
          node.extra_fields &&
          node.extra_fields.options &&
          node.extra_fields.options.completion_criteria &&
          node.extra_fields.options.completion_criteria.threshold;
        spy(value);
      });
      store.commit('contentNode/UPDATE_CONTENTNODE_FROM_INDEXEDDB', {
        id: 'test',
        'extra_fields.options.modality': 'QUIZ',
      });
      await nextTick();
      expect(store.state.contentNode.contentNodesMap.test.extra_fields.options.modality).toEqual(
        'QUIZ',
      );
      store.commit('contentNode/UPDATE_CONTENTNODE_FROM_INDEXEDDB', {
        id: 'test',
        'extra_fields.options.modality': null,
        'extra_fields.options.completion_criteria.model': 'time',
      });
      await nextTick();
      expect(
        store.state.contentNode.contentNodesMap.test.extra_fields.options.modality,
      ).toBeUndefined();
      expect(
        store.state.contentNode.contentNodesMap.test.extra_fields.options.completion_criteria.model,
      ).toEqual('time');
      store.commit('contentNode/UPDATE_CONTENTNODE_FROM_INDEXEDDB', {
        id: 'test',
        'extra_fields.options.completion_criteria.threshold': 5,
      });
      await nextTick();
      expect(
        store.state.contentNode.contentNodesMap.test.extra_fields.options.completion_criteria.model,
      ).toEqual('time');
      expect(
        store.state.contentNode.contentNodesMap.test.extra_fields.options.completion_criteria
          .threshold,
      ).toEqual(5);
      // The watch function is invoked when initially set, so this is invoked 4 times, not 3.
      expect(spy).toHaveBeenCalledTimes(4);
    });
  });
});
