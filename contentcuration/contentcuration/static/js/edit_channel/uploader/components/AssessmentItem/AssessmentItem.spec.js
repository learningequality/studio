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
      it('updates a correct item in drafts store', () => {
        selectKind(wrapper, AssessmentItemTypes.MULTIPLE_SELECTION);

        expect(
          wrapper.vm.$store.state['edit_modal'].nodesAssessmentDrafts[NODE_ID][ITEM_IDX]
        ).toEqual({ ...ITEM, type: AssessmentItemTypes.MULTIPLE_SELECTION });
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

    it('removes item from drafts store', () => {
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
});
