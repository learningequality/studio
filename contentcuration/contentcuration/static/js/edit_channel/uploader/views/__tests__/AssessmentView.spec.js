import { mount } from '@vue/test-utils';

import AssessmentView from '../AssessmentView';
import { AssessmentItemTypes, ValidationErrors } from '../../constants';
import assessmentItem from 'frontend/channelEdit/vuex/assessmentItem';
import contentNode from 'frontend/channelEdit/vuex/contentNode';
import storeFactory from 'shared/vuex/baseStore';

jest.mock('../../components//MarkdownEditor/MarkdownEditor/MarkdownEditor.vue');
jest.mock('../../components//MarkdownEditor/MarkdownViewer/MarkdownViewer.vue');

const SELECTED_NODE_IDX = 1;

const EDIT_MODAL_STATE = {
  selectedIndices: [SELECTED_NODE_IDX],
  nodes: [
    {
      title: 'Exercise 1',
      assessment_items: [
        {
          question: 'Exercise 1 - Question 1',
          type: AssessmentItemTypes.SINGLE_SELECTION,
          order: 0,
          answers: [
            { answer: 'Blue', correct: false, order: 1 },
            { answer: 'Yellow', correct: true, order: 2 },
          ],
          hints: [{ hint: 'Not red', order: 1 }],
        },
      ],
    },
    {
      title: 'Exercise 2',
      assessment_items: [
        {
          question: 'Exercise 2 - Question 1',
          type: AssessmentItemTypes.INPUT_QUESTION,
          order: 0,
          answers: [
            { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
            { answer: 'Peanut butter', correct: true, order: 2 },
          ],
        },
        {
          question: '',
          type: AssessmentItemTypes.SINGLE_SELECTION,
          order: 1,
          answers: [
            { answer: 'Peanut butter', correct: true, order: 2 },
            { answer: 'Mayonnaise (I mean you can, but...)', correct: false, order: 1 },
          ],
          hints: [
            { hint: 'Tasty!', order: 2 },
            { hint: "It's not healthy", order: 1 },
          ],
        },
        {
          question: 'Exercise 2 - Question 3',
          type: AssessmentItemTypes.MULTIPLE_SELECTION,
          order: 2,
          answers: [],
        },
      ],
    },
  ],
  validation: [
    {
      nodeIdx: 0,
      errors: {
        assessment_items: [[]],
      },
    },
    {
      nodeIdx: 1,
      errors: {
        assessment_items: [
          [],
          [ValidationErrors.QUESTION_REQUIRED],
          [ValidationErrors.INVALID_NUMBER_OF_CORRECT_ANSWERS],
        ],
      },
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
};

const initWrapper = () => {
  const store = storeFactory({
    modules: {
      assessmentItem,
      contentNode,
    },
  });

  return mount(AssessmentView, {
    store,
  });
};

describe.skip('AssessmentView', () => {
  let wrapper, state;

  beforeEach(() => {
    state = JSON.parse(JSON.stringify(EDIT_MODAL_STATE));
    wrapper = initWrapper(state);
  });

  it('renders an alert with a correct count of invalid items', () => {
    expect(wrapper.find('[data-test=alert]').html()).toContain('2 incomplete questions');
  });

  describe('on assessment editor update', () => {
    it('saves new data to store nodes', () => {
      wrapper.find({ name: 'AssessmentEditor' }).vm.$emit('update', [
        {
          question: '  Question  ',
          type: AssessmentItemTypes.SINGLE_SELECTION,
          order: 0,
          answers: [],
          hints: [],
        },
        {
          question: '',
          type: AssessmentItemTypes.MULTIPLE_SELECTION,
          order: 1,
          answers: [
            { answer: '  Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
            { answer: ' Peanut butter   ', correct: true, order: 2 },
          ],
          hints: [],
        },
      ]);

      expect(state.nodes[SELECTED_NODE_IDX].assessment_items).toEqual([
        {
          question: '  Question  ',
          type: AssessmentItemTypes.SINGLE_SELECTION,
          order: 0,
          answers: [],
          hints: [],
        },
        {
          question: '',
          type: AssessmentItemTypes.MULTIPLE_SELECTION,
          order: 1,
          answers: [
            { answer: '  Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
            { answer: ' Peanut butter   ', correct: true, order: 2 },
          ],
          hints: [],
        },
      ]);
    });
  });
});
