import { mount, createLocalVue } from '@vue/test-utils';
import Vuex from 'vuex';

import AssessmentView from '../AssessmentView';
import { AssessmentItemTypes, AssessmentItemValidationErrors } from '../../constants';

// TODO @MisRob: Consistent imports
const editModalGetters = require('../../vuex/getters');
const editModalMutations = require('../../vuex/mutations');

jest.mock('../../components/MarkdownEditor/MarkdownEditor.vue');

const localVue = createLocalVue();
localVue.use(Vuex);

const SELECTED_NODE_IDX = 1;
const SELECTED_NODE_ID = 'exercise-2';

const EDIT_MODAL_STATE = {
  selectedIndices: [SELECTED_NODE_IDX],
  nodes: [
    {
      title: 'Exercise 1',
      id: 'exercise-1',
      assessment_items: [
        {
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
      id: SELECTED_NODE_ID,
      assessment_items: [
        {
          question: '  Exercise 2 - Question 2 ',
          type: AssessmentItemTypes.SINGLE_SELECTION,
          order: 1,
          answers: JSON.stringify([
            { answer: 'Peanut butter', correct: true, order: 2 },
            { answer: '  Mayonnaise (I mean you can, but...) ', correct: true, order: 1 },
          ]),
          hints: JSON.stringify([
            { hint: '   Tasty!  ', order: 2 },
            { hint: "It's not healthy", order: 1 },
          ]),
        },
        {
          question: '',
          type: AssessmentItemTypes.MULTIPLE_SELECTION,
          order: 2,
          answers: JSON.stringify([
            { answer: '  Jelly', correct: true, order: 3 },
            { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
            { answer: 'Peanut butter  ', correct: false, order: 2 },
          ]),
        },
        {
          question: 'Exercise 2 - Question 1',
          type: AssessmentItemTypes.INPUT_QUESTION,
          order: 0,
          answers: JSON.stringify([
            { answer: ' Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
            { answer: ' Peanut butter', correct: true, order: 2 },
          ]),
        },
      ],
    },
  ],
  dialog: {
    open: false,
    title: '',
    message: '',
    submitLabel: '',
    onSubmit: () => {},
    onCancel: () => {},
  },
  nodesAssessmentDrafts: {},
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

  it('initializes an assessment draft for a seleted node, including re-ordering, sanitization and validation, answers/hints parsing', () => {
    expect(state.nodesAssessmentDrafts).toEqual({
      [SELECTED_NODE_ID]: [
        {
          data: {
            question: 'Exercise 2 - Question 1',
            type: AssessmentItemTypes.INPUT_QUESTION,
            order: 0,
            answers: [
              { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
              { answer: 'Peanut butter', correct: true, order: 2 },
            ],
            hints: [],
          },
          validation: {
            answersErrors: [],
            questionErrors: [],
          },
        },
        {
          data: {
            question: 'Exercise 2 - Question 2',
            type: AssessmentItemTypes.SINGLE_SELECTION,
            order: 1,
            answers: [
              { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
              { answer: 'Peanut butter', correct: true, order: 2 },
            ],
            hints: [{ hint: "It's not healthy", order: 1 }, { hint: 'Tasty!', order: 2 }],
          },
          validation: {
            questionErrors: [],
            answersErrors: [AssessmentItemValidationErrors.INVALID_NUMBER_OF_CORRECT_ANSWERS],
          },
        },
        {
          data: {
            question: '',
            type: AssessmentItemTypes.MULTIPLE_SELECTION,
            order: 2,
            answers: [
              { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
              { answer: 'Peanut butter', correct: false, order: 2 },
              { answer: 'Jelly', correct: true, order: 3 },
            ],
            hints: [],
          },
          validation: {
            questionErrors: [AssessmentItemValidationErrors.BLANK_QUESTION],
            answersErrors: [],
          },
        },
      ],
    });
  });

  it('updates store on each assessment editor update', () => {
    const UPDATED_ASSESSMENT_DRAFT = [
      {
        data: {
          question: '',
          type: AssessmentItemTypes.MULTIPLE_SELECTION,
          order: 0,
          answers: [
            { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
            { answer: 'Peanut butter', correct: true, order: 2 },
          ],
          hints: [],
        },
        validation: {
          answersErrors: [],
          questionErrors: [AssessmentItemValidationErrors.BLANK_QUESTION],
        },
      },
      {
        data: {
          question: 'Question',
          type: AssessmentItemTypes.SINGLE_SELECTION,
          order: 1,
          answers: [],
          hints: [],
        },
        validation: {
          questionErrors: [],
          answersErrors: [AssessmentItemValidationErrors.INVALID_NUMBER_OF_CORRECT_ANSWERS],
        },
      },
    ];

    wrapper.find({ name: 'AssessmentEditor' }).vm.$emit('update', UPDATED_ASSESSMENT_DRAFT);

    expect(state.nodesAssessmentDrafts[SELECTED_NODE_ID]).toEqual(UPDATED_ASSESSMENT_DRAFT);
  });

  describe('for an invalid exercise', () => {
    beforeEach(() => {
      const state = JSON.parse(JSON.stringify(EDIT_MODAL_STATE));
      state.nodesAssessmentDrafts = {
        [SELECTED_NODE_ID]: [
          {
            data: {
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
