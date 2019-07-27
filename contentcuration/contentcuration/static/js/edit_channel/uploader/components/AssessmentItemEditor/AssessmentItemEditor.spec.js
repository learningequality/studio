import { mount, createLocalVue } from '@vue/test-utils';
import Vuex from 'vuex';

import { AssessmentItemTypes, AssessmentItemValidationErrors } from '../../constants';
import AssessmentItemEditor from './AssessmentItemEditor';

// TODO @MisRob: Consistent imports
const editModalGetters = require('../../vuex/getters');
const editModalMutations = require('../../vuex/mutations');

jest.mock('../MarkdownEditor/MarkdownEditor.vue');

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
  dialog: {
    open: false,
    title: '',
    message: '',
    submitLabel: '',
    onSubmit: () => {},
    onCancel: () => {},
  },
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

  return mount(AssessmentItemEditor, {
    localVue,
    store,
    propsData: {
      nodeId: NODE_ID,
      itemIdx: ITEM_IDX,
      ...propsData,
    },
  });
};

const openQuestion = wrapper => {
  wrapper.find('[data-test="questionText"]').trigger('click');
};

const updateQuestion = (wrapper, newQuestionText) => {
  // only one editor is rendered at a time => "wrapper.find"
  wrapper.find({ name: 'MarkdownEditor' }).vm.$emit('update', newQuestionText);
};

const selectKind = (wrapper, kind) => {
  const input = wrapper.find('[data-test=kindSelect]');
  input.element.value = kind;

  input.trigger('input');
};

const submitConfirmationDialog = wrapper => {
  wrapper.vm.$store.state['edit_modal'].dialog.onSubmit();
};

const isConfirmationDialogOpen = wrapper => {
  return wrapper.vm.$store.state['edit_modal'].dialog.open;
};

const confirmationDialogMessage = wrapper => {
  return wrapper.vm.$store.state['edit_modal'].dialog.message;
};

describe('AssessmentItemEditor', () => {
  let wrapper;

  it('renders', () => {
    const state = JSON.parse(JSON.stringify(EDIT_MODAL_STATE));
    wrapper = initWrapper(state);

    expect(wrapper.html()).toMatchSnapshot();
  });

  describe('on question text update', () => {
    beforeEach(() => {
      const state = JSON.parse(JSON.stringify(EDIT_MODAL_STATE));
      wrapper = initWrapper(state);

      openQuestion(wrapper);
    });

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

  describe('on item type update', () => {
    describe('when changing to single selection', () => {
      describe('when there was only one correct answer', () => {
        beforeEach(() => {
          const state = JSON.parse(JSON.stringify(EDIT_MODAL_STATE));
          state.nodesAssessmentDrafts[NODE_ID][ITEM_IDX].data.type =
            AssessmentItemTypes.MULTIPLE_SELECTION;
          state.nodesAssessmentDrafts[NODE_ID][ITEM_IDX].data.answers = [
            { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
            { answer: 'Peanut butter', correct: false, order: 2 },
          ];

          wrapper = initWrapper(state);

          selectKind(wrapper, AssessmentItemTypes.SINGLE_SELECTION);
        });

        it("doesn't display confirm dialog", () => {
          expect(isConfirmationDialogOpen(wrapper)).toBe(false);
        });

        it('updates a correct item in drafts store', () => {
          expect(
            wrapper.vm.$store.state['edit_modal'].nodesAssessmentDrafts[NODE_ID][ITEM_IDX]
          ).toEqual({
            ...ITEM,
            data: {
              ...ITEM.data,
              answers: [
                { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
                { answer: 'Peanut butter', correct: false, order: 2 },
              ],
              type: AssessmentItemTypes.SINGLE_SELECTION,
            },
            validation: {
              questionErrors: [],
              answersErrors: [],
            },
          });
        });
      });

      describe('when there was more correct answers', () => {
        beforeEach(() => {
          const state = JSON.parse(JSON.stringify(EDIT_MODAL_STATE));

          state.nodesAssessmentDrafts[NODE_ID][ITEM_IDX].data.type =
            AssessmentItemTypes.MULTIPLE_SELECTION;
          state.nodesAssessmentDrafts[NODE_ID][ITEM_IDX].data.answers = [
            { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
            { answer: 'Peanut butter', correct: true, order: 2 },
          ];

          wrapper = initWrapper(state);

          selectKind(wrapper, AssessmentItemTypes.SINGLE_SELECTION);
        });

        it('displays confirm dialog with a correct message', () => {
          expect(isConfirmationDialogOpen(wrapper)).toBe(true);
          expect(confirmationDialogMessage(wrapper)).toBe(
            'Switching to single selection will set only one answer as correct. Continue?'
          );
        });

        it('updates a correct item in drafts store after dialog confirmed', () => {
          submitConfirmationDialog(wrapper);

          expect(
            wrapper.vm.$store.state['edit_modal'].nodesAssessmentDrafts[NODE_ID][ITEM_IDX]
          ).toEqual({
            ...ITEM,
            data: {
              ...ITEM.data,
              answers: [
                { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
                { answer: 'Peanut butter', correct: false, order: 2 },
              ],
              type: AssessmentItemTypes.SINGLE_SELECTION,
            },
            validation: {
              questionErrors: [],
              answersErrors: [],
            },
          });
        });
      });
    });

    describe('when changing to true/false question', () => {
      beforeEach(() => {
        const state = JSON.parse(JSON.stringify(EDIT_MODAL_STATE));

        wrapper = initWrapper(state);

        selectKind(wrapper, AssessmentItemTypes.TRUE_FALSE);
      });

      it('displays confirm dialog with a correct message', () => {
        expect(isConfirmationDialogOpen(wrapper)).toBe(true);
        expect(confirmationDialogMessage(wrapper)).toBe(
          'Switching to true or false will remove any current answers. Continue?'
        );
      });

      it('updates a correct item in drafts store after dialog confirmed', () => {
        submitConfirmationDialog(wrapper);

        expect(
          wrapper.vm.$store.state['edit_modal'].nodesAssessmentDrafts[NODE_ID][ITEM_IDX]
        ).toEqual({
          ...ITEM,
          data: {
            ...ITEM.data,
            answers: [
              { answer: 'True', correct: true, order: 1 },
              { answer: 'False', correct: false, order: 2 },
            ],
            type: AssessmentItemTypes.TRUE_FALSE,
          },
          validation: {
            questionErrors: [],
            answersErrors: [],
          },
        });
      });
    });

    describe('when changing to input question', () => {
      beforeEach(() => {
        const state = JSON.parse(JSON.stringify(EDIT_MODAL_STATE));
        state.nodesAssessmentDrafts[NODE_ID][ITEM_IDX].data.type =
          AssessmentItemTypes.SINGLE_SELECTION;
        state.nodesAssessmentDrafts[NODE_ID][ITEM_IDX].data.answers = [
          { answer: '1', correct: true, order: 1 },
          { answer: '2', correct: false, order: 2 },
        ];

        wrapper = initWrapper(state);

        selectKind(wrapper, AssessmentItemTypes.INPUT_QUESTION);
      });

      it('displays confirm dialog with a correct message', () => {
        expect(isConfirmationDialogOpen(wrapper)).toBe(true);
        expect(confirmationDialogMessage(wrapper)).toBe(
          'Switching to numeric input will set all answers as correct and remove all non-numeric answers. Continue?'
        );
      });

      it('updates a correct item in drafts store after dialog confirmed', () => {
        submitConfirmationDialog(wrapper);

        expect(
          wrapper.vm.$store.state['edit_modal'].nodesAssessmentDrafts[NODE_ID][ITEM_IDX]
        ).toEqual({
          ...ITEM,
          data: {
            ...ITEM.data,
            answers: [
              { answer: '1', correct: true, order: 1 },
              { answer: '2', correct: true, order: 2 },
            ],
            type: AssessmentItemTypes.INPUT_QUESTION,
          },
          validation: {
            questionErrors: [],
            answersErrors: [],
          },
        });
      });
    });

    describe('when changing to multiple selection', () => {
      beforeEach(() => {
        const state = JSON.parse(JSON.stringify(EDIT_MODAL_STATE));
        state.nodesAssessmentDrafts[NODE_ID][ITEM_IDX].data.type =
          AssessmentItemTypes.SINGLE_SELECTION;
        state.nodesAssessmentDrafts[NODE_ID][ITEM_IDX].data.answers = [
          { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
          { answer: 'Peanut butter', correct: false, order: 2 },
        ];

        wrapper = initWrapper(state);

        selectKind(wrapper, AssessmentItemTypes.MULTIPLE_SELECTION);
      });

      it('updates a correct item in drafts store', () => {
        expect(
          wrapper.vm.$store.state['edit_modal'].nodesAssessmentDrafts[NODE_ID][ITEM_IDX]
        ).toEqual({
          ...ITEM,
          data: {
            ...ITEM.data,
            answers: [
              { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
              { answer: 'Peanut butter', correct: false, order: 2 },
            ],
            type: AssessmentItemTypes.MULTIPLE_SELECTION,
          },
          validation: {
            questionErrors: [],
            answersErrors: [],
          },
        });
      });
    });
  });

  describe('on answers update', () => {
    beforeEach(() => {
      const state = JSON.parse(JSON.stringify(EDIT_MODAL_STATE));
      wrapper = initWrapper(state);
    });

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
    beforeEach(() => {
      const state = JSON.parse(JSON.stringify(EDIT_MODAL_STATE));
      wrapper = initWrapper(state);
    });

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

    expect(wrapper.vm.$store.state['edit_modal'].nodesAssessmentDrafts[NODE_ID][ITEM_IDX]).toEqual({
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

  describe('for an invalid item', () => {
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

      wrapper = initWrapper(state);
    });

    it('renders all errors messages', () => {
      expect(wrapper.find('[data-test=questionErrors]')).toMatchSnapshot();
      expect(wrapper.find('[data-test=answersErrors]')).toMatchSnapshot();
    });
  });
});
