import { mount, createLocalVue } from '@vue/test-utils';
import Vuex from 'vuex';

import { AssessmentItemTypes, AssessmentItemValidationErrors } from '../../constants';
import AssessmentItem from './AssessmentItem';

// TODO @MisRob: Consistent imports
const editModalGetters = require('../../vuex/getters');
const editModalMutations = require('../../vuex/mutations');

const localVue = createLocalVue();
localVue.use(Vuex);

const NODE_ID = 'exercise-2';
const ITEM_IDX = 1;
const ITEM = {
  data: {
    id: 'exercise-2-item-2',
    question: 'Exercise 2 - Question 2',
    type: AssessmentItemTypes.SINGLE_SELECTION,
    order: 1,
    answers: [
      { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
      { answer: 'Peanut butter', correct: false, order: 2 },
    ],
    hints: [{ hint: "It's not healthy", order: 1 }, { hint: 'Tasty!', order: 2 }],
  },
  validation: {},
};

const EDIT_MODAL_STATE = {
  nodesAssessmentDrafts: {
    [NODE_ID]: [
      {
        data: {
          id: 'exercise-2-item-1',
          question: 'Exercise 2 - Question 1',
          type: AssessmentItemTypes.INPUT_QUESTION,
          order: 0,
          answers: [
            { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
            { answer: 'Peanut butter', correct: true, order: 2 },
          ],
          hints: [],
        },
        validation: {},
      },
      ITEM,
      {
        data: {
          id: 'exercise-2-item-3',
          question: 'Exercise 2 - Question 3',
          type: AssessmentItemTypes.INPUT_QUESTION,
          order: 2,
          answers: [],
          hints: [],
        },
        validation: {},
      },
    ],
  },
};

const clickCloseBtn = wrapper => {
  wrapper.find('[data-test=closeBtn]').trigger('click');
};

const clickToolbarEditIcon = wrapper => {
  wrapper.find('[data-test=toolbarIconEdit]').trigger('click');
};

const updateQuestion = (wrapper, newQuestion) => {
  wrapper.find('[data-test=questionInput]').setValue(newQuestion);
};

const clickDeleteItem = wrapper => {
  wrapper.find('[data-test=toolbarMenuDeleteItem]').trigger('click');
};

const clickAddQuestionAbove = wrapper => {
  wrapper.find('[data-test=toolbarMenuAddItemAbove]').trigger('click');
};

const clickAddQuestionBelow = wrapper => {
  wrapper.find('[data-test=toolbarMenuAddItemBelow]').trigger('click');
};

const clickMoveItemUp = wrapper => {
  wrapper.find('[data-test=toolbarIconArrowUp]').trigger('click');
};

const clickMoveItemDown = wrapper => {
  wrapper.find('[data-test=toolbarIconArrowDown]').trigger('click');
};

const initWrapper = (state, propsData) => {
  const store = new Vuex.Store({
    modules: {
      edit_modal: {
        namespaced: true,
        state,
        getters: editModalGetters,
        mutations: editModalMutations,
      },
    },
  });

  return mount(AssessmentItem, {
    localVue,
    store,
    propsData,
  });
};

describe('AssessmentItem', () => {
  let wrapper;

  describe('for a closed item', () => {
    beforeEach(() => {
      const state = JSON.parse(JSON.stringify(EDIT_MODAL_STATE));
      const propsData = {
        nodeId: NODE_ID,
        itemIdx: ITEM_IDX,
        isOpen: false,
      };

      wrapper = initWrapper(state, propsData);
    });

    it('renders', () => {
      expect(wrapper.html()).toMatchSnapshot();
    });

    describe('on toolbar edit click', () => {
      it('emits open event', () => {
        clickToolbarEditIcon(wrapper);

        expect(wrapper.emitted().open).toBeTruthy();
        expect(wrapper.emitted().open.length).toBe(1);
      });
    });
  });

  describe('for a closed invalid item', () => {
    beforeEach(() => {
      const state = JSON.parse(JSON.stringify(EDIT_MODAL_STATE));
      state.nodesAssessmentDrafts[NODE_ID][ITEM_IDX] = {
        data: {
          id: 'exercise-2-item-2',
          question: '',
          type: AssessmentItemTypes.SINGLE_SELECTION,
          order: 1,
          answers: [
            { answer: 'Mayonnaise (I mean you can, but...)', correct: false, order: 1 },
            { answer: 'Peanut butter', correct: false, order: 2 },
          ],
          hints: [],
        },
        validation: {
          questionErrors: [AssessmentItemValidationErrors.BLANK_QUESTION],
          answersErrors: [AssessmentItemValidationErrors.INVALID_NUMBER_OF_CORRECT_ANSWERS],
        },
      };

      const propsData = {
        nodeId: NODE_ID,
        itemIdx: ITEM_IDX,
        isOpen: false,
      };

      wrapper = initWrapper(state, propsData);
    });

    it('renders "Incomplete" indicator', () => {
      expect(wrapper.contains('[data-test=invalidIndicator]')).toBe(true);
    });
  });

  describe('when closed with answers preview', () => {
    beforeEach(() => {
      const state = JSON.parse(JSON.stringify(EDIT_MODAL_STATE));
      const propsData = {
        nodeId: NODE_ID,
        itemIdx: ITEM_IDX,
        isOpen: false,
        displayAnswersPreview: true,
      };

      wrapper = initWrapper(state, propsData);
    });

    it('renders', () => {
      expect(wrapper.html()).toMatchSnapshot();
    });
  });

  describe('when open', () => {
    beforeEach(() => {
      const state = JSON.parse(JSON.stringify(EDIT_MODAL_STATE));
      const propsData = {
        nodeId: NODE_ID,
        itemIdx: ITEM_IDX,
        isOpen: true,
      };

      wrapper = initWrapper(state, propsData);
    });

    it('renders', () => {
      expect(wrapper.html()).toMatchSnapshot();
    });

    describe('on question update', () => {
      it('updates a correct item in drafts store', () => {
        updateQuestion(wrapper, 'What color is your eyes?');

        expect(
          wrapper.vm.$store.state['edit_modal'].nodesAssessmentDrafts[NODE_ID][ITEM_IDX]
        ).toEqual({
          ...ITEM,
          data: {
            ...ITEM.data,
            question: 'What color is your eyes?',
          },
          validation: {
            questionErrors: [],
            answersErrors: [],
          },
        });
      });

      it('sanitizes and validates a correct item in drafts store', () => {
        updateQuestion(wrapper, '   ');

        expect(
          wrapper.vm.$store.state['edit_modal'].nodesAssessmentDrafts[NODE_ID][ITEM_IDX]
        ).toEqual({
          ...ITEM,
          data: {
            ...ITEM.data,
            question: '',
          },
          validation: {
            questionErrors: [AssessmentItemValidationErrors.BLANK_QUESTION],
            answersErrors: [],
          },
        });
      });
    });

    describe('on answers update', () => {
      it('updates a correct item in drafts store', () => {
        const newAnswers = [
          { answer: 'Answer 1', correct: false, order: 1 },
          { answer: 'Answer 2', correct: true, order: 2 },
        ];

        wrapper.find({ name: 'AnswersEditor' }).vm.$emit('update', newAnswers);

        expect(
          wrapper.vm.$store.state['edit_modal'].nodesAssessmentDrafts[NODE_ID][ITEM_IDX]
        ).toEqual({
          ...ITEM,
          data: {
            ...ITEM.data,
            answers: [
              { answer: 'Answer 1', correct: false, order: 1 },
              { answer: 'Answer 2', correct: true, order: 2 },
            ],
          },
          validation: {
            questionErrors: [],
            answersErrors: [],
          },
        });
      });

      it('sanitizes and validates a correct item in drafts store', () => {
        const newAnswers = [
          { answer: 'Answer 1  ', correct: false, order: 1 },
          { answer: '  Answer 2  ', correct: false, order: 2 },
        ];

        wrapper.find({ name: 'AnswersEditor' }).vm.$emit('update', newAnswers);

        expect(
          wrapper.vm.$store.state['edit_modal'].nodesAssessmentDrafts[NODE_ID][ITEM_IDX]
        ).toEqual({
          ...ITEM,
          data: {
            ...ITEM.data,
            answers: [
              { answer: 'Answer 1', correct: false, order: 1 },
              { answer: 'Answer 2', correct: false, order: 2 },
            ],
          },
          validation: {
            questionErrors: [],
            answersErrors: [AssessmentItemValidationErrors.INVALID_NUMBER_OF_CORRECT_ANSWERS],
          },
        });
      });
    });

    describe('on hints update', () => {
      it('updates a correct item in drafts store', () => {
        const newHints = [{ hint: 'Hint 1', order: 1 }, { hint: 'Hint 2', order: 2 }];

        wrapper.find({ name: 'HintsEditor' }).vm.$emit('update', newHints);

        expect(
          wrapper.vm.$store.state['edit_modal'].nodesAssessmentDrafts[NODE_ID][ITEM_IDX]
        ).toEqual({
          ...ITEM,
          data: {
            ...ITEM.data,
            hints: [{ hint: 'Hint 1', order: 1 }, { hint: 'Hint 2', order: 2 }],
          },
          validation: {
            questionErrors: [],
            answersErrors: [],
          },
        });
      });
    });

    it('sanitizes and validates a correct item in drafts store', () => {
      const newHints = [{ hint: '  Hint 1 ', order: 1 }, { hint: '  Hint 2 ', order: 2 }];

      wrapper.find({ name: 'HintsEditor' }).vm.$emit('update', newHints);

      expect(
        wrapper.vm.$store.state['edit_modal'].nodesAssessmentDrafts[NODE_ID][ITEM_IDX]
      ).toEqual({
        ...ITEM,
        data: {
          ...ITEM.data,
          hints: [{ hint: 'Hint 1', order: 1 }, { hint: 'Hint 2', order: 2 }],
        },
        validation: {
          questionErrors: [],
          answersErrors: [],
        },
      });
    });
  });

  describe('on close click', () => {
    it('emits close event', () => {
      clickCloseBtn(wrapper);

      expect(wrapper.emitted().close).toBeTruthy();
      expect(wrapper.emitted().close.length).toBe(1);
    });
  });

  describe('on delete item click', () => {
    it('emits delete event', () => {
      clickDeleteItem(wrapper);

      expect(wrapper.emitted().delete).toBeTruthy();
      expect(wrapper.emitted().delete.length).toBe(1);
    });
  });

  describe('on "Add question above" click', () => {
    it('emits add item above event', () => {
      clickAddQuestionAbove(wrapper);

      expect(wrapper.emitted().addItemAbove).toBeTruthy();
      expect(wrapper.emitted().addItemAbove.length).toBe(1);
    });
  });

  describe('on "Add question below" click', () => {
    it('emits add item below event', () => {
      clickAddQuestionBelow(wrapper);

      expect(wrapper.emitted().addItemBelow).toBeTruthy();
      expect(wrapper.emitted().addItemBelow.length).toBe(1);
    });
  });

  describe('on "Move up" click', () => {
    describe('for a first item', () => {
      beforeEach(() => {
        const state = JSON.parse(JSON.stringify(EDIT_MODAL_STATE));
        const propsData = {
          nodeId: NODE_ID,
          itemIdx: 0,
        };

        wrapper = initWrapper(state, propsData);
        clickMoveItemUp(wrapper);
      });

      it("doesn't emit move up event", () => {
        expect(wrapper.emitted().moveUp).toBeFalsy();
      });
    });

    describe('for an item that is not first', () => {
      beforeEach(() => {
        const state = JSON.parse(JSON.stringify(EDIT_MODAL_STATE));
        const propsData = {
          nodeId: NODE_ID,
          itemIdx: 1,
        };

        wrapper = initWrapper(state, propsData);
        clickMoveItemUp(wrapper);
      });

      it('emits move up event', () => {
        expect(wrapper.emitted().moveUp).toBeTruthy();
        expect(wrapper.emitted().moveUp.length).toBe(1);
      });
    });
  });

  describe('on "Move down" click', () => {
    describe('for a last item', () => {
      beforeEach(() => {
        const state = JSON.parse(JSON.stringify(EDIT_MODAL_STATE));
        const propsData = {
          nodeId: NODE_ID,
          itemIdx: 2,
        };

        wrapper = initWrapper(state, propsData);
        clickMoveItemDown(wrapper);
      });

      it("doesn't emit move down event", () => {
        expect(wrapper.emitted().moveDown).toBeFalsy();
      });
    });

    describe('for an item that is not last', () => {
      beforeEach(() => {
        const state = JSON.parse(JSON.stringify(EDIT_MODAL_STATE));
        const propsData = {
          nodeId: NODE_ID,
          itemIdx: 1,
        };

        wrapper = initWrapper(state, propsData);
        clickMoveItemDown(wrapper);
      });

      it('emits move down event', () => {
        expect(wrapper.emitted().moveDown).toBeTruthy();
        expect(wrapper.emitted().moveDown.length).toBe(1);
      });
    });
  });

  describe('for an open invalid item', () => {
    beforeEach(() => {
      const state = JSON.parse(JSON.stringify(EDIT_MODAL_STATE));
      state.nodesAssessmentDrafts[NODE_ID][ITEM_IDX] = {
        data: {
          id: 'exercise-2-item-2',
          question: '',
          type: AssessmentItemTypes.SINGLE_SELECTION,
          order: 1,
          answers: [
            { answer: 'Mayonnaise (I mean you can, but...)', correct: false, order: 1 },
            { answer: 'Peanut butter', correct: false, order: 2 },
          ],
          hints: [],
        },
        validation: {
          questionErrors: [AssessmentItemValidationErrors.BLANK_QUESTION],
          answersErrors: [AssessmentItemValidationErrors.INVALID_NUMBER_OF_CORRECT_ANSWERS],
        },
      };

      const propsData = {
        nodeId: NODE_ID,
        itemIdx: ITEM_IDX,
        isOpen: true,
      };

      wrapper = initWrapper(state, propsData);
    });

    it('renders all errors messages', () => {
      expect(wrapper.find('[data-test=questionErrors]')).toMatchSnapshot();
      expect(wrapper.find('[data-test=answersErrors]')).toMatchSnapshot();
    });
  });
});
