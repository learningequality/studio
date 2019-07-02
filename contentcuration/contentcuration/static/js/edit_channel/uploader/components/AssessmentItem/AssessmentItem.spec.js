import { mount, createLocalVue } from '@vue/test-utils';
import Vuex from 'vuex';

import { AssessmentItemTypes } from '../../constants';
import AssessmentItem from './AssessmentItem';

// TODO @MisRob: Consistent imports
const editModalGetters = require('../../vuex/getters');
const editModalMutations = require('../../vuex/mutations');

const localVue = createLocalVue();
localVue.use(Vuex);

const NODE_ID = 'exercise-2';
const ITEM_IDX = 1;
const ITEM = {
  id: 'exercise-2-item-2',
  question: 'Exercise 2 - Question 2',
  type: AssessmentItemTypes.SINGLE_SELECTION,
  order: 1,
  answers: [
    { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
    { answer: 'Peanut butter', correct: false, order: 2 },
  ],
  hints: [{ hint: "It's not healthy", order: 1 }, { hint: 'Tasty!', order: 2 }],
};

const EDIT_MODAL_STATE = {
  nodesAssessmentDrafts: {
    [NODE_ID]: [
      {
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
      ITEM,
      {
        id: 'exercise-2-item-3',
        question: 'Exercise 2 - Question 3',
        type: AssessmentItemTypes.INPUT_QUESTION,
        order: 2,
        answers: [],
        hints: [],
      },
    ],
  },
};

const clickCloseBtn = wrapper => {
  wrapper.find('[data-test=closeBtn]').trigger('click');
};

const selectKind = (wrapper, kind) => {
  const input = wrapper.find('[data-test=kindSelect]');
  input.element.value = kind;

  input.trigger('input');
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

const confirmDialog = wrapper => {
  wrapper.find('[data-test=dialogSubmitBtn]').trigger('click');
};

const containsConfirmDialog = wrapper => {
  return wrapper.vm.dialog.open;
};

const getConfirmDialogMessage = wrapper => {
  return wrapper.find('[data-test=dialogMessage]').text();
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

  describe('when closed', () => {
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

    describe('on item type update', () => {
      describe('when changing to single selection', () => {
        describe('when there was only one correct answer', () => {
          beforeEach(() => {
            const state = JSON.parse(JSON.stringify(EDIT_MODAL_STATE));
            state.nodesAssessmentDrafts[NODE_ID][ITEM_IDX].type =
              AssessmentItemTypes.MULTIPLE_SELECTION;
            state.nodesAssessmentDrafts[NODE_ID][ITEM_IDX].answers = [
              { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
              { answer: 'Peanut butter', correct: false, order: 2 },
            ];

            const propsData = {
              nodeId: NODE_ID,
              itemIdx: ITEM_IDX,
              isOpen: true,
            };

            wrapper = initWrapper(state, propsData);

            selectKind(wrapper, AssessmentItemTypes.SINGLE_SELECTION);
          });

          it("doesn't display confirm dialog", () => {
            expect(containsConfirmDialog(wrapper)).toBe(false);
          });

          it('updates a correct item in drafts store', () => {
            expect(
              wrapper.vm.$store.state['edit_modal'].nodesAssessmentDrafts[NODE_ID][ITEM_IDX]
            ).toEqual({
              ...ITEM,
              answers: [
                { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
                { answer: 'Peanut butter', correct: false, order: 2 },
              ],
              type: AssessmentItemTypes.SINGLE_SELECTION,
            });
          });
        });

        describe('when there was more correct answers', () => {
          beforeEach(() => {
            const state = JSON.parse(JSON.stringify(EDIT_MODAL_STATE));

            state.nodesAssessmentDrafts[NODE_ID][ITEM_IDX].type =
              AssessmentItemTypes.MULTIPLE_SELECTION;
            state.nodesAssessmentDrafts[NODE_ID][ITEM_IDX].answers = [
              { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
              { answer: 'Peanut butter', correct: true, order: 2 },
            ];

            const propsData = {
              nodeId: NODE_ID,
              itemIdx: ITEM_IDX,
              isOpen: true,
            };

            wrapper = initWrapper(state, propsData);

            selectKind(wrapper, AssessmentItemTypes.SINGLE_SELECTION);
          });

          it('displays confirm dialog with a correct message', () => {
            expect(containsConfirmDialog(wrapper)).toBe(true);
            expect(getConfirmDialogMessage(wrapper)).toBe(
              'Switching to single selection will set only one answer as correct. Continue?'
            );
          });

          it('updates a correct item in drafts store after dialog confirmed', () => {
            confirmDialog(wrapper);

            expect(
              wrapper.vm.$store.state['edit_modal'].nodesAssessmentDrafts[NODE_ID][ITEM_IDX]
            ).toEqual({
              ...ITEM,
              answers: [
                { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
                { answer: 'Peanut butter', correct: false, order: 2 },
              ],
              type: AssessmentItemTypes.SINGLE_SELECTION,
            });
          });
        });
      });

      describe('when changing to true/false question', () => {
        beforeEach(() => {
          const state = JSON.parse(JSON.stringify(EDIT_MODAL_STATE));

          const propsData = {
            nodeId: NODE_ID,
            itemIdx: ITEM_IDX,
            isOpen: true,
          };

          wrapper = initWrapper(state, propsData);

          selectKind(wrapper, AssessmentItemTypes.TRUE_FALSE);
        });

        it('displays confirm dialog with a correct message', () => {
          expect(containsConfirmDialog(wrapper)).toBe(true);
          expect(getConfirmDialogMessage(wrapper)).toBe(
            'Switching to true or false will remove any current answers. Continue?'
          );
        });

        it('updates a correct item in drafts store after dialog confirmed', () => {
          confirmDialog(wrapper);

          expect(
            wrapper.vm.$store.state['edit_modal'].nodesAssessmentDrafts[NODE_ID][ITEM_IDX]
          ).toEqual({
            ...ITEM,
            answers: [
              { answer: 'True', correct: true, order: 1 },
              { answer: 'False', correct: false, order: 2 },
            ],
            type: AssessmentItemTypes.TRUE_FALSE,
          });
        });
      });

      describe('when changing to input question', () => {
        beforeEach(() => {
          const state = JSON.parse(JSON.stringify(EDIT_MODAL_STATE));
          state.nodesAssessmentDrafts[NODE_ID][ITEM_IDX].type =
            AssessmentItemTypes.SINGLE_SELECTION;
          state.nodesAssessmentDrafts[NODE_ID][ITEM_IDX].answers = [
            { answer: '1', correct: true, order: 1 },
            { answer: '2', correct: false, order: 2 },
          ];

          const propsData = {
            nodeId: NODE_ID,
            itemIdx: ITEM_IDX,
            isOpen: true,
          };

          wrapper = initWrapper(state, propsData);

          selectKind(wrapper, AssessmentItemTypes.INPUT_QUESTION);
        });

        it('displays confirm dialog with a correct message', () => {
          expect(containsConfirmDialog(wrapper)).toBe(true);
          expect(getConfirmDialogMessage(wrapper)).toBe(
            'Switching to numeric input will set all answers as correct and remove all non-numeric answers. Continue?'
          );
        });

        it('updates a correct item in drafts store after dialog confirmed', () => {
          confirmDialog(wrapper);

          expect(
            wrapper.vm.$store.state['edit_modal'].nodesAssessmentDrafts[NODE_ID][ITEM_IDX]
          ).toEqual({
            ...ITEM,
            answers: [
              { answer: '1', correct: true, order: 1 },
              { answer: '2', correct: true, order: 2 },
            ],
            type: AssessmentItemTypes.INPUT_QUESTION,
          });
        });
      });

      describe('when changing to multiple selection', () => {
        beforeEach(() => {
          const state = JSON.parse(JSON.stringify(EDIT_MODAL_STATE));
          state.nodesAssessmentDrafts[NODE_ID][ITEM_IDX].type =
            AssessmentItemTypes.SINGLE_SELECTION;
          state.nodesAssessmentDrafts[NODE_ID][ITEM_IDX].answers = [
            { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
            { answer: 'Peanut butter', correct: false, order: 2 },
          ];

          const propsData = {
            nodeId: NODE_ID,
            itemIdx: ITEM_IDX,
            isOpen: true,
          };

          wrapper = initWrapper(state, propsData);

          selectKind(wrapper, AssessmentItemTypes.MULTIPLE_SELECTION);
        });

        it('updates a correct item in drafts store', () => {
          expect(
            wrapper.vm.$store.state['edit_modal'].nodesAssessmentDrafts[NODE_ID][ITEM_IDX]
          ).toEqual({
            ...ITEM,
            answers: [
              { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
              { answer: 'Peanut butter', correct: false, order: 2 },
            ],
            type: AssessmentItemTypes.MULTIPLE_SELECTION,
          });
        });
      });
    });

    describe('on question update', () => {
      it('updates a correct item in drafts store', () => {
        updateQuestion(wrapper, 'What color is your eyes?');

        expect(
          wrapper.vm.$store.state['edit_modal'].nodesAssessmentDrafts[NODE_ID][ITEM_IDX]
        ).toEqual({ ...ITEM, question: 'What color is your eyes?' });
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
          answers: [
            { answer: 'Answer 1', correct: false, order: 1 },
            { answer: 'Answer 2', correct: true, order: 2 },
          ],
        });
      });
    });

    describe('on hints update', () => {
      it('updates a correct item in drafts store', () => {
        const newHints = [{ hint: 'Hint 1', order: 1 }, { hint: 'Hint 2', order: 2 }];

        wrapper.find({ name: 'HintsEditor' }).vm.$emit('update', newHints);

        expect(
          wrapper.vm.$store.state['edit_modal'].nodesAssessmentDrafts[NODE_ID][ITEM_IDX]
        ).toEqual({ ...ITEM, hints: [{ hint: 'Hint 1', order: 1 }, { hint: 'Hint 2', order: 2 }] });
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
    beforeEach(() => {
      const state = JSON.parse(JSON.stringify(EDIT_MODAL_STATE));
      const propsData = {
        nodeId: NODE_ID,
        itemIdx: ITEM_IDX,
      };

      wrapper = initWrapper(state, propsData);
      clickDeleteItem(wrapper);
    });

    it('displays confirm dialog with a correct message', () => {
      expect(containsConfirmDialog(wrapper)).toBe(true);
      expect(getConfirmDialogMessage(wrapper)).toBe(
        'Are you sure you want to delete this question?'
      );
    });

    it('removes item from drafts store after dialog confirmed', () => {
      confirmDialog(wrapper);

      expect(wrapper.vm.$store.state['edit_modal'].nodesAssessmentDrafts[NODE_ID]).toEqual([
        {
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
        {
          id: 'exercise-2-item-3',
          question: 'Exercise 2 - Question 3',
          type: AssessmentItemTypes.INPUT_QUESTION,
          order: 1,
          answers: [],
          hints: [],
        },
      ]);
    });
  });

  describe('on "Add question above" click', () => {
    beforeEach(() => {
      const state = JSON.parse(JSON.stringify(EDIT_MODAL_STATE));
      const propsData = {
        nodeId: NODE_ID,
        itemIdx: ITEM_IDX,
      };

      wrapper = initWrapper(state, propsData);
      clickAddQuestionAbove(wrapper);
    });

    it('adds a new item in drafts store before this item', () => {
      expect(wrapper.vm.$store.state['edit_modal'].nodesAssessmentDrafts[NODE_ID]).toEqual([
        {
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
        {
          question: '',
          type: AssessmentItemTypes.SINGLE_SELECTION,
          order: 1,
        },
        { ...ITEM, order: 2 },
        {
          id: 'exercise-2-item-3',
          question: 'Exercise 2 - Question 3',
          type: AssessmentItemTypes.INPUT_QUESTION,
          order: 3,
          answers: [],
          hints: [],
        },
      ]);
    });

    it('emits new item added event with an index of a newly added item', () => {
      expect(wrapper.emitted().newItemAdded).toBeTruthy();
      expect(wrapper.emitted().newItemAdded.length).toBe(1);
      expect(wrapper.emitted().newItemAdded[0][0]).toBe(1);
    });
  });

  describe('on "Add question below" click', () => {
    beforeEach(() => {
      const state = JSON.parse(JSON.stringify(EDIT_MODAL_STATE));
      const propsData = {
        nodeId: NODE_ID,
        itemIdx: ITEM_IDX,
      };

      wrapper = initWrapper(state, propsData);
      clickAddQuestionBelow(wrapper);
    });

    it('adds a new item in drafts store after this item', () => {
      expect(wrapper.vm.$store.state['edit_modal'].nodesAssessmentDrafts[NODE_ID]).toEqual([
        {
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
        ITEM,
        {
          question: '',
          type: AssessmentItemTypes.SINGLE_SELECTION,
          order: 2,
        },
        {
          id: 'exercise-2-item-3',
          question: 'Exercise 2 - Question 3',
          type: AssessmentItemTypes.INPUT_QUESTION,
          order: 3,
          answers: [],
          hints: [],
        },
      ]);
    });

    it('emits new item added event with an index of a newly added item', () => {
      expect(wrapper.emitted().newItemAdded).toBeTruthy();
      expect(wrapper.emitted().newItemAdded.length).toBe(1);
      expect(wrapper.emitted().newItemAdded[0][0]).toBe(2);
    });
  });

  describe('on "Move up" click', () => {
    beforeEach(() => {
      const state = JSON.parse(JSON.stringify(EDIT_MODAL_STATE));
      const propsData = {
        nodeId: NODE_ID,
        itemIdx: ITEM_IDX,
      };

      wrapper = initWrapper(state, propsData);
      clickMoveItemUp(wrapper);
    });

    it('moves an item up in drafts store', () => {
      expect(wrapper.vm.$store.state['edit_modal'].nodesAssessmentDrafts[NODE_ID]).toEqual([
        { ...ITEM, order: 0 },
        {
          id: 'exercise-2-item-1',
          question: 'Exercise 2 - Question 1',
          type: AssessmentItemTypes.INPUT_QUESTION,
          order: 1,
          answers: [
            { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
            { answer: 'Peanut butter', correct: true, order: 2 },
          ],
          hints: [],
        },
        {
          id: 'exercise-2-item-3',
          question: 'Exercise 2 - Question 3',
          type: AssessmentItemTypes.INPUT_QUESTION,
          order: 2,
          answers: [],
          hints: [],
        },
      ]);
    });

    it('emits items swapped event', () => {
      expect(wrapper.emitted().itemsSwapped).toBeTruthy();
      expect(wrapper.emitted().itemsSwapped.length).toBe(1);
      expect(wrapper.emitted().itemsSwapped[0][0]).toEqual({ firstItemIdx: 1, secondItemIdx: 0 });
    });
  });

  describe('on "Move down" click', () => {
    beforeEach(() => {
      const state = JSON.parse(JSON.stringify(EDIT_MODAL_STATE));
      const propsData = {
        nodeId: NODE_ID,
        itemIdx: ITEM_IDX,
      };

      wrapper = initWrapper(state, propsData);
      clickMoveItemDown(wrapper);
    });

    it('moves an item down in drafts store', () => {
      expect(wrapper.vm.$store.state['edit_modal'].nodesAssessmentDrafts[NODE_ID]).toEqual([
        {
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
        {
          id: 'exercise-2-item-3',
          question: 'Exercise 2 - Question 3',
          type: AssessmentItemTypes.INPUT_QUESTION,
          order: 1,
          answers: [],
          hints: [],
        },
        { ...ITEM, order: 2 },
      ]);
    });

    it('emits items swapped event', () => {
      expect(wrapper.emitted().itemsSwapped).toBeTruthy();
      expect(wrapper.emitted().itemsSwapped.length).toBe(1);
      expect(wrapper.emitted().itemsSwapped[0][0]).toEqual({ firstItemIdx: 1, secondItemIdx: 2 });
    });
  });
});
