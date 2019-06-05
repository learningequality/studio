import { mount, createLocalVue } from '@vue/test-utils';
import Vuex from 'vuex';
import AssessmentView from './AssessmentView';

// TODO @MisRob: Consistent imports
const editModalGetters = require('../vuex/getters');

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
          order: 0,
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
          order: 1,
        },
        {
          id: 2,
          question: 'Exercise 2 - Question 3',
          order: 2,
        },
        {
          id: 1,
          question: 'Exercise 2 - Question 1',
          order: 0,
        },
      ],
    },
  ],
};

const initWrapper = state => {
  const store = new Vuex.Store({
    modules: {
      edit_modal: {
        namespaced: true,
        state,
        getters: editModalGetters,
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
      wrapper = initWrapper(EDIT_MODAL_STATE);
    });

    it('renders correctly ordered questions of a selected exercise', () => {
      const questions = wrapper.findAll('[data-test=questionText]');

      expect(questions.length).toBe(3);
      expect(questions.at(0).text()).toBe('Exercise 2 - Question 1');
      expect(questions.at(1).text()).toBe('Exercise 2 - Question 2');
      expect(questions.at(2).text()).toBe('Exercise 2 - Question 3');
    });
  });
});
