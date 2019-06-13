import { mount, createLocalVue } from '@vue/test-utils';
import Vuex from 'vuex';

import { AssessmentItemTypes } from '../constants';
import AssessmentView from './AssessmentView';

// TODO @MisRob: Consistent imports
const editModalGetters = require('../vuex/getters');
const editModalMutations = require('../vuex/mutations');

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
          id: 1,
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
};

const clickNewQuestionBtn = wrapper => {
  wrapper
    .find('[data-test=newQuestionBtn]')
    .find('button')
    .trigger('click');
};

const checkShowAnswers = wrapper => {
  wrapper
    .find('[data-test=showAnswersCheckbox]')
    .find('input')
    .setChecked(true);
};

const getAssessmentItems = wrapper => {
  return wrapper.findAll({ name: 'AssessmentItem' });
};

const isAssessmentItemOpen = assessmentItemWrapper => {
  return assessmentItemWrapper.contains('[data-test="open"]');
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
  let wrapper;

  describe('for an exercise without questions', () => {
    beforeEach(() => {
      const state = JSON.parse(JSON.stringify(EDIT_MODAL_STATE));
      state.nodes[1].assessment_items = [];

      wrapper = initWrapper(state);
    });

    it('renders placeholder text', () => {
      expect(wrapper.html()).toContain('No questions yet');
    });
  });

  describe('for an exercise with some questions', () => {
    beforeEach(() => {
      const state = JSON.parse(JSON.stringify(EDIT_MODAL_STATE));
      wrapper = initWrapper(state);
    });

    it('renders correctly ordered items of a selected exercise', () => {
      const assessmentItems = getAssessmentItems(wrapper);

      expect(assessmentItems.length).toBe(3);

      expect(assessmentItems.at(0).html()).toContain('Exercise 2 - Question 1');
      expect(assessmentItems.at(1).html()).toContain('Exercise 2 - Question 2');
      expect(assessmentItems.at(2).html()).toContain('Exercise 2 - Question 3');
    });

    it('renders items as closed by default', () => {
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
  });

  describe('on a new question button click', () => {
    beforeEach(() => {
      const state = JSON.parse(JSON.stringify(EDIT_MODAL_STATE));
      wrapper = initWrapper(state);
      clickNewQuestionBtn(wrapper);
    });

    it('renders a new item and opens it', () => {
      const assessmentItems = getAssessmentItems(wrapper);

      expect(assessmentItems.length).toBe(4);

      expect(isAssessmentItemOpen(assessmentItems.at(0))).toBe(false);
      expect(isAssessmentItemOpen(assessmentItems.at(1))).toBe(false);
      expect(isAssessmentItemOpen(assessmentItems.at(2))).toBe(false);
      expect(isAssessmentItemOpen(assessmentItems.at(3))).toBe(true);
    });
  });
});
