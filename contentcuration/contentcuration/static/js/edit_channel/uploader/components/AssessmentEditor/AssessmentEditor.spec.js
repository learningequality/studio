import { shallowMount, mount } from '@vue/test-utils';

import {
  AssessmentItemTypes,
  AssessmentItemToolbarActions,
  ValidationErrors,
} from '../../constants';
import AssessmentEditor from './AssessmentEditor';

jest.mock('../MarkdownEditor/MarkdownEditor.vue');
jest.mock('../MarkdownViewer/MarkdownViewer.vue');

const ITEMS = [
  {
    question: 'Question 1',
    type: AssessmentItemTypes.INPUT_QUESTION,
    order: 0,
    answers: [
      { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
      { answer: 'Peanut butter', correct: true, order: 2 },
    ],
    hints: [],
  },
  {
    question: 'Question 2',
    type: AssessmentItemTypes.SINGLE_SELECTION,
    order: 1,
    answers: [
      { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
      { answer: 'Peanut butter', correct: true, order: 2 },
    ],
    hints: [{ hint: "It's not healthy", order: 1 }, { hint: 'Tasty!', order: 2 }],
  },
  {
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
];

const ITEMS_VALIDATION = [
  [],
  [ValidationErrors.INVALID_NUMBER_OF_CORRECT_ANSWERS],
  [ValidationErrors.QUESTION_REQUIRED],
];

const checkShowAnswers = wrapper => {
  wrapper
    .find('[data-test="showAnswersCheckbox"]')
    .find('input')
    .setChecked(true);
};

const getItems = wrapper => {
  return wrapper.findAll('[data-test="item"]');
};

const isItemOpen = assessmentItemWrapper => {
  return assessmentItemWrapper.contains('[data-test="editor"]');
};

const clickNewQuestionBtn = wrapper => {
  wrapper
    .find('[data-test="newQuestionBtn"]')
    .find('button')
    .trigger('click');
};

const clickClose = assessmentItemWrapper => {
  assessmentItemWrapper.find('[data-test="closeBtn"]').trigger('click');
};

const clickEdit = assessmentItemWrapper => {
  assessmentItemWrapper
    .find(`[data-test="toolbarIcon-${AssessmentItemToolbarActions.EDIT_ITEM}"]`)
    .trigger('click');
};

const clickDelete = assessmentItemWrapper => {
  assessmentItemWrapper
    .find(`[data-test="toolbarMenuItem-${AssessmentItemToolbarActions.DELETE_ITEM}"]`)
    .trigger('click');
};

const clickAddQuestionAbove = assessmentItemWrapper => {
  assessmentItemWrapper
    .find(`[data-test="toolbarMenuItem-${AssessmentItemToolbarActions.ADD_ITEM_ABOVE}"]`)
    .trigger('click');
};

const clickAddQuestionBelow = assessmentItemWrapper => {
  assessmentItemWrapper
    .find(`[data-test="toolbarMenuItem-${AssessmentItemToolbarActions.ADD_ITEM_BELOW}"]`)
    .trigger('click');
};

const clickMoveUp = assessmentItemWrapper => {
  assessmentItemWrapper
    .find(`[data-test="toolbarIcon-${AssessmentItemToolbarActions.MOVE_ITEM_UP}"]`)
    .trigger('click');
};

const clickMoveDown = assessmentItemWrapper => {
  assessmentItemWrapper
    .find(`[data-test="toolbarIcon-${AssessmentItemToolbarActions.MOVE_ITEM_DOWN}"]`)
    .trigger('click');
};

describe('AssessmentEditor', () => {
  let wrapper;

  beforeEach(() => {
    wrapper = mount(AssessmentEditor, {
      propsData: {
        items: ITEMS,
        itemsValidation: ITEMS_VALIDATION,
      },
    });
  });

  it('smoke test', () => {
    const wrapper = shallowMount(AssessmentEditor);

    expect(wrapper.isVueInstance()).toBe(true);
  });

  describe('for an exercise with no questions', () => {
    let wrapper;

    beforeEach(() => {
      wrapper = mount(AssessmentEditor, {
        propsData: {
          items: [],
        },
      });
    });

    it('renders placeholder text if exercise has no questions', () => {
      expect(wrapper.html()).toContain('No questions yet');
    });

    it("doesn't render 'Show answers' checkbox", () => {
      expect(wrapper.contains('[data-test="showAnswersCheckbox"]')).toBe(false);
    });
  });

  it('renders closed items - order, question type, text, error indicator, toolbar', () => {
    expect(wrapper.html()).toMatchSnapshot();
  });

  it("renders 'Show answers' checkbox", () => {
    expect(wrapper.contains('[data-test="showAnswersCheckbox"]')).toBe(true);
  });

  it('renders answers preview on show answers click', () => {
    checkShowAnswers(wrapper);

    expect(wrapper.html()).toMatchSnapshot();
  });

  it('opens an item on item click', () => {
    const items = getItems(wrapper);
    items.at(1).trigger('click');

    expect(isItemOpen(items.at(0))).toBe(false);
    expect(isItemOpen(items.at(1))).toBe(true);
    expect(isItemOpen(items.at(2))).toBe(false);
  });

  it('opens an item on toolbar edit icon click', () => {
    const items = getItems(wrapper);
    clickEdit(items.at(1));

    expect(isItemOpen(items.at(0))).toBe(false);
    expect(isItemOpen(items.at(1))).toBe(true);
    expect(isItemOpen(items.at(2))).toBe(false);
  });

  it('closes an item on close button click', () => {
    // open an item at first
    const items = getItems(wrapper);
    items.at(1).trigger('click');
    expect(isItemOpen(items.at(1))).toBe(true);

    // now close it
    clickClose(items.at(1));
    expect(isItemOpen(items.at(1))).toBe(false);
  });

  it('emits update event with updated assessment items on item "Delete" click', () => {
    const items = getItems(wrapper);

    clickDelete(items.at(1));

    expect(wrapper.emitted().update).toBeTruthy();
    const lastUpdate = wrapper.emitted().update.length - 1;
    expect(wrapper.emitted().update[lastUpdate][0]).toEqual([
      {
        question: 'Question 1',
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
        type: AssessmentItemTypes.MULTIPLE_SELECTION,
        order: 1,
        answers: [
          { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
          { answer: 'Peanut butter', correct: false, order: 2 },
          { answer: 'Jelly', correct: true, order: 3 },
        ],
        hints: [],
      },
    ]);
  });

  it('emits update event with updated assessment items on item "Add question above" click', () => {
    const items = getItems(wrapper);

    clickAddQuestionAbove(items.at(1));

    expect(wrapper.emitted().update).toBeTruthy();
    const lastUpdate = wrapper.emitted().update.length - 1;
    expect(wrapper.emitted().update[lastUpdate][0]).toEqual([
      {
        question: 'Question 1',
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
        answers: [],
        hints: [],
        isNew: true,
      },
      {
        question: 'Question 2',
        type: AssessmentItemTypes.SINGLE_SELECTION,
        order: 2,
        answers: [
          { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
          { answer: 'Peanut butter', correct: true, order: 2 },
        ],
        hints: [{ hint: "It's not healthy", order: 1 }, { hint: 'Tasty!', order: 2 }],
      },
      {
        question: '',
        type: AssessmentItemTypes.MULTIPLE_SELECTION,
        order: 3,
        answers: [
          { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
          { answer: 'Peanut butter', correct: false, order: 2 },
          { answer: 'Jelly', correct: true, order: 3 },
        ],
        hints: [],
      },
    ]);
  });

  it('emits update event with updated assessment items on item "Add question below" click', () => {
    const items = getItems(wrapper);

    clickAddQuestionBelow(items.at(1));

    expect(wrapper.emitted().update).toBeTruthy();
    const lastUpdate = wrapper.emitted().update.length - 1;
    expect(wrapper.emitted().update[lastUpdate][0]).toEqual([
      {
        question: 'Question 1',
        type: AssessmentItemTypes.INPUT_QUESTION,
        order: 0,
        answers: [
          { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
          { answer: 'Peanut butter', correct: true, order: 2 },
        ],
        hints: [],
      },
      {
        question: 'Question 2',
        type: AssessmentItemTypes.SINGLE_SELECTION,
        order: 1,
        answers: [
          { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
          { answer: 'Peanut butter', correct: true, order: 2 },
        ],
        hints: [{ hint: "It's not healthy", order: 1 }, { hint: 'Tasty!', order: 2 }],
      },
      {
        question: '',
        type: AssessmentItemTypes.SINGLE_SELECTION,
        order: 2,
        answers: [],
        hints: [],
        isNew: true,
      },
      {
        question: '',
        type: AssessmentItemTypes.MULTIPLE_SELECTION,
        order: 3,
        answers: [
          { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
          { answer: 'Peanut butter', correct: false, order: 2 },
          { answer: 'Jelly', correct: true, order: 3 },
        ],
        hints: [],
      },
    ]);
  });

  it('emits update event with updated assessment items on item "Move up" click', () => {
    const items = getItems(wrapper);

    clickMoveUp(items.at(1));

    expect(wrapper.emitted().update).toBeTruthy();
    const lastUpdate = wrapper.emitted().update.length - 1;
    expect(wrapper.emitted().update[lastUpdate][0]).toEqual([
      {
        question: 'Question 2',
        type: AssessmentItemTypes.SINGLE_SELECTION,
        order: 0,
        answers: [
          { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
          { answer: 'Peanut butter', correct: true, order: 2 },
        ],
        hints: [{ hint: "It's not healthy", order: 1 }, { hint: 'Tasty!', order: 2 }],
      },
      {
        question: 'Question 1',
        type: AssessmentItemTypes.INPUT_QUESTION,
        order: 1,
        answers: [
          { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
          { answer: 'Peanut butter', correct: true, order: 2 },
        ],
        hints: [],
      },
      {
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
    ]);
  });

  it('emits update event with updated assessment items on item "Move down" click', () => {
    const items = getItems(wrapper);

    clickMoveDown(items.at(1));

    expect(wrapper.emitted().update).toBeTruthy();
    const lastUpdate = wrapper.emitted().update.length - 1;
    expect(wrapper.emitted().update[lastUpdate][0]).toEqual([
      {
        question: 'Question 1',
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
        type: AssessmentItemTypes.MULTIPLE_SELECTION,
        order: 1,
        answers: [
          { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
          { answer: 'Peanut butter', correct: false, order: 2 },
          { answer: 'Jelly', correct: true, order: 3 },
        ],
        hints: [],
      },
      {
        question: 'Question 2',
        type: AssessmentItemTypes.SINGLE_SELECTION,
        order: 2,
        answers: [
          { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
          { answer: 'Peanut butter', correct: true, order: 2 },
        ],
        hints: [{ hint: "It's not healthy", order: 1 }, { hint: 'Tasty!', order: 2 }],
      },
    ]);
  });

  it('emits update event with updated assessment items on new question button click', () => {
    clickNewQuestionBtn(wrapper);

    expect(wrapper.emitted().update).toBeTruthy();
    const lastUpdate = wrapper.emitted().update.length - 1;
    expect(wrapper.emitted().update[lastUpdate][0]).toEqual([
      {
        question: 'Question 1',
        type: AssessmentItemTypes.INPUT_QUESTION,
        order: 0,
        answers: [
          { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
          { answer: 'Peanut butter', correct: true, order: 2 },
        ],
        hints: [],
      },
      {
        question: 'Question 2',
        type: AssessmentItemTypes.SINGLE_SELECTION,
        order: 1,
        answers: [
          { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
          { answer: 'Peanut butter', correct: true, order: 2 },
        ],
        hints: [{ hint: "It's not healthy", order: 1 }, { hint: 'Tasty!', order: 2 }],
      },
      {
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
      {
        question: '',
        type: AssessmentItemTypes.SINGLE_SELECTION,
        order: 3,
        answers: [],
        hints: [],
        isNew: true,
      },
    ]);
  });
});
