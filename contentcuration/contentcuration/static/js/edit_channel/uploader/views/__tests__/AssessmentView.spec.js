// Rather for documentation purposes - until we can convert following scenarios
// to some e2e mechanism that would be easier to maintain and more suitable
// for complex logic

import { mount, createLocalVue } from '@vue/test-utils';
import Vuex from 'vuex';

import { AssessmentItemTypes, AssessmentItemValidationErrors } from '../../constants';
import AssessmentView from '../AssessmentView';

// TODO @MisRob: Consistent imports
const editModalGetters = require('../../vuex/getters');
const editModalMutations = require('../../vuex/mutations');

jest.mock('../../components/MarkdownEditor/MarkdownEditor.vue');

const localVue = createLocalVue();
localVue.use(Vuex);

const EDIT_MODAL_STATE = {
  selectedIndices: [1],
  nodes: [
    {
      title: 'Exercise 1',
      id: 'exercise-1',
      assessment_items: [
        {
          id: 0,
          question: 'Exercise 1 - Question 1',
          type: AssessmentItemTypes.SINGLE_SELECTION,
          order: 0,
          answers: JSON.stringify([
            { answer: 'Blue', correct: false, order: 1 },
            { answer: 'Yellow', correct: true, order: 2 },
          ]),
          hints: JSON.stringify([{ hint: 'Not red', order: 1 }]),
        },
      ],
    },
    {
      title: 'Exercise 2',
      id: 'exercise-2',
      assessment_items: [
        {
          id: 1,
          question: 'Exercise 2 - Question 2',
          type: AssessmentItemTypes.SINGLE_SELECTION,
          order: 1,
          answers: JSON.stringify([
            { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
            { answer: 'Peanut butter', correct: false, order: 2 },
          ]),
          hints: JSON.stringify([
            { hint: "It's not healthy", order: 1 },
            { hint: 'Tasty!', order: 2 },
          ]),
        },
        {
          id: 2,
          question: 'Exercise 2 - Question 3',
          type: AssessmentItemTypes.MULTIPLE_SELECTION,
          order: 2,
          answers: JSON.stringify([
            { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
            { answer: 'Peanut butter', correct: false, order: 2 },
            { answer: 'Jelly', correct: true, order: 3 },
          ]),
        },
        {
          id: 0,
          question: 'Exercise 2 - Question 1',
          type: AssessmentItemTypes.INPUT_QUESTION,
          order: 0,
          answers: JSON.stringify([
            { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
            { answer: 'Peanut butter', correct: true, order: 2 },
          ]),
        },
      ],
    },
  ],
  nodesAssessmentDrafts: {},
  dialog: {
    open: false,
    title: '',
    message: '',
    submitLabel: '',
    onSubmit: () => {},
    onCancel: () => {},
  },
};

const clickNewQuestionBtn = wrapper => {
  wrapper
    .find('[data-test="newQuestionBtn"]')
    .find('button')
    .trigger('click');
};

const checkShowAnswers = wrapper => {
  wrapper
    .find('[data-test="showAnswersCheckbox"]')
    .find('input')
    .setChecked(true);
};

const getAssessmentItems = wrapper => {
  return wrapper.findAll('[data-test="assessmentItem"]');
};

const isAssessmentItemOpen = assessmentItemWrapper => {
  return assessmentItemWrapper.contains('[data-test="assessmentItemEdit"]');
};

const clickClose = assessmentItemWrapper => {
  assessmentItemWrapper.find('[data-test="closeBtn"]').trigger('click');
};

const clickEdit = assessmentItemWrapper => {
  assessmentItemWrapper.find('[data-test="toolbarIconEdit"]').trigger('click');
};

const clickDelete = assessmentItemWrapper => {
  assessmentItemWrapper.find('[data-test="toolbarMenuDeleteItem"]').trigger('click');
};

const clickAddQuestionAbove = assessmentItemWrapper => {
  assessmentItemWrapper.find('[data-test="toolbarMenuAddItemAbove"]').trigger('click');
};

const clickAddQuestionBelow = assessmentItemWrapper => {
  assessmentItemWrapper.find('[data-test="toolbarMenuAddItemBelow"]').trigger('click');
};

const clickMoveUp = assessmentItemWrapper => {
  assessmentItemWrapper.find('[data-test="toolbarIconArrowUp"]').trigger('click');
};

const clickMoveDown = assessmentItemWrapper => {
  assessmentItemWrapper.find('[data-test="toolbarIconArrowDown"]').trigger('click');
};

// would be better to use e2e tests for larger views like this
// instead of hacking into store to pretend that a dialog has been
// confirmed
const submitConfirmationDialog = wrapper => {
  wrapper.vm.$store.state['edit_modal'].dialog.onSubmit();
};

const initWrapper = state => {
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

  return mount(AssessmentView, {
    localVue,
    store,
  });
};

describe('AssessmentView', () => {
  let wrapper, state;

  beforeEach(() => {
    state = JSON.parse(JSON.stringify(EDIT_MODAL_STATE));
    wrapper = initWrapper(state);
  });

  it('saves assessment items of a selected node to drafts store after mounted', () => {
    expect(state.nodesAssessmentDrafts).toEqual({
      'exercise-2': [
        {
          data: {
            id: 0,
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
        {
          data: {
            id: 1,
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
        },
        {
          data: {
            id: 2,
            question: 'Exercise 2 - Question 3',
            type: AssessmentItemTypes.MULTIPLE_SELECTION,
            order: 2,
            answers: [
              { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
              { answer: 'Peanut butter', correct: false, order: 2 },
              { answer: 'Jelly', correct: true, order: 3 },
            ],
            hints: [],
          },
          validation: {},
        },
      ],
    });
  });

  it('renders placeholder text if exercise has no questions', () => {
    const state = JSON.parse(JSON.stringify(EDIT_MODAL_STATE));
    state.nodes[1].assessment_items = [];

    const wrapper = initWrapper(state);

    expect(wrapper.html()).toContain('No questions yet');
  });

  it('renders correctly ordered items of a selected exercise', () => {
    const assessmentItems = getAssessmentItems(wrapper);

    expect(assessmentItems.length).toBe(3);

    expect(assessmentItems.at(0).html()).toContain('Exercise 2 - Question 1');
    expect(assessmentItems.at(1).html()).toContain('Exercise 2 - Question 2');
    expect(assessmentItems.at(2).html()).toContain('Exercise 2 - Question 3');
  });

  it('renders items closed by default', () => {
    const assessmentItems = getAssessmentItems(wrapper);

    expect(isAssessmentItemOpen(assessmentItems.at(0))).toBe(false);
    expect(isAssessmentItemOpen(assessmentItems.at(1))).toBe(false);
    expect(isAssessmentItemOpen(assessmentItems.at(2))).toBe(false);
  });

  it("doesn't render answers preview by default", () => {
    expect(wrapper.html()).not.toContain('Mayonnaise (I mean you can, but...)');
    expect(wrapper.html()).not.toContain('Peanut butter');
    expect(wrapper.html()).not.toContain('Jelly');
  });

  it('renders answers preview on show answers click', () => {
    checkShowAnswers(wrapper);

    expect(wrapper.html()).toContain('Mayonnaise (I mean you can, but...)');
    expect(wrapper.html()).toContain('Peanut butter');
    expect(wrapper.html()).toContain('Jelly');
  });

  it('opens an item on item click', () => {
    const assessmentItems = getAssessmentItems(wrapper);
    assessmentItems.at(1).trigger('click');

    expect(isAssessmentItemOpen(assessmentItems.at(0))).toBe(false);
    expect(isAssessmentItemOpen(assessmentItems.at(1))).toBe(true);
    expect(isAssessmentItemOpen(assessmentItems.at(2))).toBe(false);
  });

  it('opens an item on toolbar edit icon click', () => {
    const assessmentItems = getAssessmentItems(wrapper);
    clickEdit(assessmentItems.at(1));

    expect(isAssessmentItemOpen(assessmentItems.at(0))).toBe(false);
    expect(isAssessmentItemOpen(assessmentItems.at(1))).toBe(true);
    expect(isAssessmentItemOpen(assessmentItems.at(2))).toBe(false);
  });

  it('closes an item on close button click', () => {
    // open an item at first
    const assessmentItems = getAssessmentItems(wrapper);
    assessmentItems.at(1).trigger('click');
    expect(isAssessmentItemOpen(assessmentItems.at(1))).toBe(true);

    // now close it
    clickClose(assessmentItems.at(1));
    expect(isAssessmentItemOpen(assessmentItems.at(1))).toBe(false);
  });

  it('removes an item on delete item click', () => {
    const assessmentItems = getAssessmentItems(wrapper);

    clickDelete(assessmentItems.at(1));
    submitConfirmationDialog(wrapper);

    const newAssessmentItems = getAssessmentItems(wrapper);
    expect(newAssessmentItems.length).toBe(2);

    expect(newAssessmentItems.at(0).html()).toContain('Exercise 2 - Question 1');
    expect(newAssessmentItems.at(1).html()).toContain('Exercise 2 - Question 3');
  });

  describe('on "Add question above" click', () => {
    beforeEach(() => {
      const assessmentItems = getAssessmentItems(wrapper);

      clickAddQuestionAbove(assessmentItems.at(1));
    });

    it('renders a new question in a correct place', () => {
      const assessmentItems = getAssessmentItems(wrapper);

      expect(assessmentItems.length).toBe(4);

      expect(assessmentItems.at(0).html()).toContain('Exercise 2 - Question 1');

      expect(assessmentItems.at(2).html()).toContain('Exercise 2 - Question 2');
      expect(assessmentItems.at(3).html()).toContain('Exercise 2 - Question 3');
    });

    it('opens a new question', () => {
      const assessmentItems = getAssessmentItems(wrapper);

      expect(isAssessmentItemOpen(assessmentItems.at(0))).toBe(false);
      expect(isAssessmentItemOpen(assessmentItems.at(1))).toBe(true);
      expect(isAssessmentItemOpen(assessmentItems.at(2))).toBe(false);
      expect(isAssessmentItemOpen(assessmentItems.at(3))).toBe(false);
    });
  });

  describe('on "Add question below" click', () => {
    beforeEach(() => {
      const assessmentItems = getAssessmentItems(wrapper);

      clickAddQuestionBelow(assessmentItems.at(1));
    });

    it('renders a new question in a correct place', () => {
      const assessmentItems = getAssessmentItems(wrapper);

      expect(assessmentItems.length).toBe(4);

      expect(assessmentItems.at(0).html()).toContain('Exercise 2 - Question 1');
      expect(assessmentItems.at(1).html()).toContain('Exercise 2 - Question 2');

      expect(assessmentItems.at(3).html()).toContain('Exercise 2 - Question 3');
    });

    it('opens a new question', () => {
      const assessmentItems = getAssessmentItems(wrapper);

      expect(isAssessmentItemOpen(assessmentItems.at(0))).toBe(false);
      expect(isAssessmentItemOpen(assessmentItems.at(1))).toBe(false);
      expect(isAssessmentItemOpen(assessmentItems.at(2))).toBe(true);
      expect(isAssessmentItemOpen(assessmentItems.at(3))).toBe(false);
    });
  });

  describe('on "Move up" click', () => {
    it('moves an item up', () => {
      const assessmentItems = getAssessmentItems(wrapper);

      clickMoveUp(assessmentItems.at(1));

      expect(assessmentItems.at(0).html()).toContain('Exercise 2 - Question 2');
      expect(assessmentItems.at(1).html()).toContain('Exercise 2 - Question 1');
      expect(assessmentItems.at(2).html()).toContain('Exercise 2 - Question 3');
    });
  });

  describe('on "Move down" click', () => {
    it('moves an item down', () => {
      const assessmentItems = getAssessmentItems(wrapper);

      clickMoveDown(assessmentItems.at(1));

      expect(assessmentItems.at(0).html()).toContain('Exercise 2 - Question 1');
      expect(assessmentItems.at(1).html()).toContain('Exercise 2 - Question 3');
      expect(assessmentItems.at(2).html()).toContain('Exercise 2 - Question 2');
    });
  });

  describe('on a new question button click', () => {
    beforeEach(() => {
      clickNewQuestionBtn(wrapper);
    });

    it('renders a new item', () => {
      const assessmentItems = getAssessmentItems(wrapper);

      expect(assessmentItems.length).toBe(4);
    });

    it('opens a new item', () => {
      const assessmentItems = getAssessmentItems(wrapper);

      expect(isAssessmentItemOpen(assessmentItems.at(0))).toBe(false);
      expect(isAssessmentItemOpen(assessmentItems.at(1))).toBe(false);
      expect(isAssessmentItemOpen(assessmentItems.at(2))).toBe(false);
      expect(isAssessmentItemOpen(assessmentItems.at(3))).toBe(true);
    });
  });

  describe('for an invalid exercise', () => {
    beforeEach(() => {
      const state = JSON.parse(JSON.stringify(EDIT_MODAL_STATE));
      state.nodesAssessmentDrafts = {
        'exercise-2': [
          {
            data: {
              id: 0,
              question: '',
              type: AssessmentItemTypes.INPUT_QUESTION,
              order: 0,
              answers: [
                { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
                { answer: 'Peanut butter', correct: true, order: 2 },
              ],
              hints: [],
            },
            validation: {
              questionErrors: [AssessmentItemValidationErrors.BLANK_QUESTION],
            },
          },
          {
            data: {
              id: 1,
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
          },
          {
            data: {
              id: 2,
              question: '',
              type: AssessmentItemTypes.MULTIPLE_SELECTION,
              order: 2,
              answers: [
                { answer: 'Mayonnaise (I mean you can, but...)', correct: false, order: 1 },
                { answer: 'Peanut butter', correct: false, order: 2 },
                { answer: 'Jelly', correct: false, order: 3 },
              ],
              hints: [],
            },
            validation: {
              questionErrors: [AssessmentItemValidationErrors.BLANK_QUESTION],
              answersErrors: [AssessmentItemValidationErrors.INVALID_NUMBER_OF_CORRECT_ANSWERS],
            },
          },
        ],
      };
      wrapper = initWrapper(state);
    });

    it('renders an alert with a correct count of invalid items', () => {
      expect(wrapper.find('[data-test=alert]').html()).toContain('2 incomplete questions');
    });
  });
});
