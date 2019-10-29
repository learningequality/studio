import {
  nodeAssessmentItems,
  nodeAssessmentItemsCount,
  nodeErrors,
  invalidNodeAssessmentItemsCount,
  areNodeDetailsValid,
  areNodeAssessmentItemsValid,
  isNodeValid,
  invalidNodes,
} from '../getters';
import { ValidationErrors } from '../../constants';

describe('edit_modal', () => {
  describe('getters', () => {
    describe('nodeAssessmentItems', () => {
      let state;

      beforeEach(() => {
        state = {
          nodes: [
            {
              title: 'Node 1',
            },
            {
              title: 'Node 2',
              assessment_items: [{ id: 1 }, { id: 2 }],
            },
          ],
        };
      });

      it('returns assessment items of a correct node', () => {
        expect(nodeAssessmentItems(state)(1)).toEqual([{ id: 1 }, { id: 2 }]);
      });

      it('returns an empty array if a node has no assessment items', () => {
        expect(nodeAssessmentItems(state)(0)).toEqual([]);
      });
    });

    describe('nodeAssessmentItemsCount', () => {
      let state;

      beforeEach(() => {
        state = {
          nodes: [
            {
              title: 'Node 1',
            },
            {
              title: 'Node 2',
              assessment_items: [{ id: 1 }, { id: 2 }],
            },
          ],
        };
      });

      it('returns a correct number of assessment items of a correct node', () => {
        expect(nodeAssessmentItemsCount(state)(1)).toBe(2);
      });

      it('returns 0 if a node has no assessment items', () => {
        expect(nodeAssessmentItemsCount(state)(0)).toBe(0);
      });
    });

    describe('nodeErrors', () => {
      let state;

      beforeEach(() => {
        state = {
          validation: [
            {
              nodeIdx: 1,
              errors: {
                details: [ValidationErrors.TITLE_REQUIRED],
              },
            },
            {
              nodeIdx: 0,
              errors: {
                details: [ValidationErrors.LICENCE_REQUIRED],
                assessment_items: [
                  [ValidationErrors.QUESTION_REQUIRED],
                  [
                    ValidationErrors.QUESTION_REQUIRED,
                    ValidationErrors.INVALID_NUMBER_OF_CORRECT_ANSWERS,
                  ],
                ],
              },
            },
          ],
        };
      });

      it('returns a correct errors object', () => {
        expect(nodeErrors(state)(0)).toEqual({
          details: [ValidationErrors.LICENCE_REQUIRED],
          assessment_items: [
            [ValidationErrors.QUESTION_REQUIRED],
            [
              ValidationErrors.QUESTION_REQUIRED,
              ValidationErrors.INVALID_NUMBER_OF_CORRECT_ANSWERS,
            ],
          ],
        });
      });

      it('returns `null` if there are no validation data for the node', () => {
        expect(nodeErrors(state)(2)).toBeNull();
      });
    });

    describe('invalidNodeAssessmentItemsCount', () => {
      let state;

      beforeEach(() => {
        state = {
          validation: [
            {
              nodeIdx: 1,
              errors: {
                assessment_items: [[], []],
              },
            },
            {
              nodeIdx: 0,
              errors: {
                assessment_items: [
                  [ValidationErrors.QUESTION_REQUIRED],
                  [],
                  [
                    ValidationErrors.QUESTION_REQUIRED,
                    ValidationErrors.INVALID_NUMBER_OF_CORRECT_ANSWERS,
                  ],
                  [],
                ],
              },
            },
          ],
        };
      });

      it('returns a number of invalid assessment items of a correct node', () => {
        expect(invalidNodeAssessmentItemsCount(state)(0)).toBe(2);
      });

      it('returns 0 if all assessment items of a node are valid', () => {
        expect(invalidNodeAssessmentItemsCount(state)(1)).toBe(0);
      });

      it('returns 0 if there are no validation data for assessment items', () => {
        expect(invalidNodeAssessmentItemsCount(state)(2)).toBe(0);
      });
    });

    describe('areNodeDetailsValid', () => {
      let state;

      beforeEach(() => {
        state = {
          validation: [
            {
              nodeIdx: 1,
              errors: {
                details: [ValidationErrors.TITLE_REQUIRED],
              },
            },
            {
              nodeIdx: 0,
              errors: {
                details: [],
              },
            },
          ],
        };
      });

      it('returns `true` if all details of a node are valid', () => {
        expect(areNodeDetailsValid(state)(0)).toBe(true);
      });

      it('returns `false` if there is at least one detail of a node that is invalid', () => {
        expect(areNodeDetailsValid(state)(1)).toBe(false);
      });
    });

    describe('areNodeAssessmentItemsValid', () => {
      let state;

      beforeEach(() => {
        state = {
          validation: [
            {
              nodeIdx: 1,
              errors: {
                assessment_items: [[], []],
              },
            },
            {
              nodeIdx: 0,
              errors: {
                assessment_items: [[], [ValidationErrors.QUESTION_REQUIRED], []],
              },
            },
          ],
        };
      });

      it('returns `true` if all assessment items of a node are valid', () => {
        expect(areNodeAssessmentItemsValid(state)(1)).toBe(true);
      });

      it('returns `false` if there is at least one assessment item of a node that is invalid', () => {
        expect(areNodeAssessmentItemsValid(state)(0)).toBe(false);
      });
    });

    describe('isNodeValid', () => {
      let state;

      beforeEach(() => {
        state = {
          validation: [
            {
              nodeIdx: 1,
              errors: {
                details: [ValidationErrors.LICENCE_REQUIRED],
              },
            },
            {
              nodeIdx: 0,
              errors: {
                details: [],
                assessment_items: [],
              },
            },
            {
              nodeIdx: 2,
              errors: {
                assessment_items: [[], [ValidationErrors.INVALID_NUMBER_OF_CORRECT_ANSWERS], []],
              },
            },
          ],
        };
      });

      it('returns `false` if a given node has invalid details', () => {
        expect(isNodeValid(state)(1)).toBe(false);
      });

      it('returns `false` if a given node has invalid assessment items', () => {
        expect(isNodeValid(state)(2)).toBe(false);
      });

      it('returns `true` when both details and assessment items are valid', () => {
        expect(isNodeValid(state)(0)).toBe(true);
      });
    });

    describe('invalidNodes', () => {
      let state;

      beforeEach(() => {
        state = {
          nodes: [
            { title: 'Node 0' },
            { title: 'Node 1' },
            { title: 'Node 2' },
            { title: 'Node 3', isNew: true },
          ],
          validation: [
            {
              nodeIdx: 1,
              errors: {
                details: [],
                assessment_items: [],
              },
            },
            {
              nodeIdx: 0,
              errors: {
                details: [ValidationErrors.TITLE_REQUIRED, ValidationErrors.LICENCE_REQUIRED],
                assessment_items: [],
              },
            },
            {
              nodeIdx: 3,
              errors: {
                details: [ValidationErrors.LICENCE_REQUIRED],
                assessment_items: [
                  [
                    ValidationErrors.QUESTION_REQUIRED,
                    ValidationErrors.INVALID_NUMBER_OF_CORRECT_ANSWERS,
                  ],
                  [],
                  [ValidationErrors.QUESTION_REQUIRED],
                ],
              },
            },
            {
              nodeIdx: 2,
              errors: {
                assessment_items: [[], [ValidationErrors.INVALID_NUMBER_OF_CORRECT_ANSWERS], []],
              },
            },
          ],
        };
      });

      it('returns an array of all invalid nodes by default', () => {
        expect(invalidNodes(state)()).toEqual([0, 2, 3]);
      });

      it('ignores all invalid nodes marked by new if `ignoreNewNodes` set to `true`', () => {
        expect(invalidNodes(state)({ ignoreNewNodes: true })).toEqual([0, 2]);
      });
    });
  });
});
