import { SAVE_NEXT_STEPS, REMOVE_PREVIOUS_STEP, ADD_PREVIOUS_STEP } from '../mutations';

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
});
