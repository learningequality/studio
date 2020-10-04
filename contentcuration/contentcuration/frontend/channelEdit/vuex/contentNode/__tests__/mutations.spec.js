import { SAVE_NEXT_STEPS, REMOVE_PREVIOUS_STEP, ADD_PREVIOUS_STEP } from '../mutations';
import { generateMaps } from './utils';

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

      const maps = generateMaps([
        ['id-integrals', 'id-physics'],
        ['id-physics', 'id-astronomy'],
        ['id-astronomy', 'id-spaceships-contruction'],
        ['id-integrals', 'id-chemistry'],
        ['id-chemistry', 'id-lab'],
        ['id-elementary-math', 'id-integrals'],
        ['id-reading', 'id-elementary-math'],
      ]);

      expect(state.nextStepsMap).toEqual(maps.nextStepsMap);
      expect(state.previousStepsMap).toEqual(maps.previousStepsMap);
    });

    it("shouldn't save duplicates", () => {
      state = {
        ...generateMaps([
          ['id-physics', 'id-astronomy'],
          ['id-reading', 'id-philosophy'],
          ['id-chemistry', 'id-lab'],
        ]),
      };

      SAVE_NEXT_STEPS(state, { mappings });

      const maps = generateMaps([
        ['id-reading', 'id-philosophy'],
        ['id-integrals', 'id-physics'],
        ['id-physics', 'id-astronomy'],
        ['id-astronomy', 'id-spaceships-contruction'],
        ['id-integrals', 'id-chemistry'],
        ['id-chemistry', 'id-lab'],
        ['id-elementary-math', 'id-integrals'],
        ['id-reading', 'id-elementary-math'],
      ]);

      expect(state.nextStepsMap).toEqual(maps.nextStepsMap);
      expect(state.previousStepsMap).toEqual(maps.previousStepsMap);
    });
  });

  describe('REMOVE_PREVIOUS_STEP', () => {
    let state;

    it('removes a corresponding entry from vuex state', () => {
      state = {
        ...generateMaps([
          ['id-integrals', 'id-physics'],
          ['id-reading', 'id-physics'],
          ['id-physics', 'id-astronomy'],
        ]),
      };

      REMOVE_PREVIOUS_STEP(state, {
        targetId: 'id-physics',
        previousStepId: 'id-integrals',
      });

      const maps = generateMaps([
        ['id-reading', 'id-physics'],
        ['id-physics', 'id-astronomy'],
      ]);
      expect(state.nextStepsMap).toEqual(maps.nextStepsMap);
      expect(state.previousStepsMap).toEqual(maps.previousStepsMap);
    });
  });

  describe('ADD_PREVIOUS_STEP', () => {
    let state;

    beforeEach(() => {
      state = {
        ...generateMaps([
          ['id-integrals', 'id-physics'],
          ['id-reading', 'id-physics'],
          ['id-physics', 'id-astronomy'],
        ]),
      };
    });

    it("doesn't add an entry to vuex state if it's there already", () => {
      ADD_PREVIOUS_STEP(state, {
        targetId: 'id-physics',
        previousStepId: 'id-reading',
      });

      const maps = generateMaps([
        ['id-integrals', 'id-physics'],
        ['id-reading', 'id-physics'],
        ['id-physics', 'id-astronomy'],
      ]);
      expect(state.nextStepsMap).toEqual(maps.nextStepsMap);
      expect(state.previousStepsMap).toEqual(maps.previousStepsMap);
    });

    it('adds an entry to vuex state', () => {
      ADD_PREVIOUS_STEP(state, {
        targetId: 'id-spaceships-engineering',
        previousStepId: 'id-astronomy',
      });

      const maps = generateMaps([
        ['id-integrals', 'id-physics'],
        ['id-reading', 'id-physics'],
        ['id-physics', 'id-astronomy'],
        ['id-astronomy', 'id-spaceships-engineering'],
      ]);
      expect(state.nextStepsMap).toEqual(maps.nextStepsMap);
      expect(state.previousStepsMap).toEqual(maps.previousStepsMap);
    });
  });
});
