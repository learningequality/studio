import { shallowMount, mount } from '@vue/test-utils';

import {
  AssessmentItemTypes,
  AssessmentItemToolbarActions,
  ValidationErrors,
} from '../../constants';
import AssessmentEditor from './AssessmentEditor';

jest.mock('shared/views/MarkdownEditor/MarkdownEditor/MarkdownEditor.vue');
jest.mock('shared/views/MarkdownEditor/MarkdownViewer/MarkdownViewer.vue');

const NODE_ID = 'node-id';
const ITEM1 = {
  'assessment-id': 'question-1',
  question: 'Question 1',
  type: AssessmentItemTypes.INPUT_QUESTION,
  order: 0,
  answers: [
    { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
    { answer: 'Peanut butter', correct: true, order: 2 },
  ],
  hints: [],
};
const ITEM2 = {
  'assessment-id': 'question-2',
  question: 'Question 2',
  type: AssessmentItemTypes.SINGLE_SELECTION,
  order: 1,
  answers: [
    { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
    { answer: 'Peanut butter', correct: true, order: 2 },
  ],
  hints: [
    { hint: "It's not healthy", order: 1 },
    { hint: 'Tasty!', order: 2 },
  ],
};
const ITEM3 = {
  'assessment-id': 'question-3',
  question: 'Question 3',
  type: AssessmentItemTypes.MULTIPLE_SELECTION,
  order: 2,
  answers: [
    { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
    { answer: 'Peanut butter', correct: false, order: 2 },
    { answer: 'Jelly', correct: true, order: 3 },
  ],
  hints: [],
};
const ITEM4 = {
  'assessment-id': 'question-4',
  question: 'Question 4',
  type: AssessmentItemTypes.TRUE_FALSE,
  order: 3,
  answers: [
    { answer: 'True', correct: false, order: 1 },
    { answer: 'False', correct: true, order: 2 },
  ],
  hints: [],
};

const ITEMS = [ITEM1, ITEM2, ITEM3, ITEM4];
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

const isAnswersPreviewVisible = assessmentItemWrapper => {
  return assessmentItemWrapper.contains('[data-test="item-answers-preview"]');
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
        nodeId: NODE_ID,
        items: ITEMS,
        itemsValidation: ITEMS_VALIDATION,
      },
      stubs: {
        AssessmentItemEditor: true,
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
          nodeId: NODE_ID,
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

  it('renders all items', () => {
    const items = getItems(wrapper);

    expect(items.length).toBe(4);

    expect(items.at(0).html()).toContain(ITEM1.question);
    expect(items.at(1).html()).toContain(ITEM2.question);
    expect(items.at(2).html()).toContain(ITEM3.question);
    expect(items.at(3).html()).toContain(ITEM4.question);
  });

  it('renders items as closed', () => {
    const items = getItems(wrapper);

    expect(isItemOpen(items.at(0))).toBe(false);
    expect(isItemOpen(items.at(1))).toBe(false);
    expect(isItemOpen(items.at(2))).toBe(false);
    expect(isItemOpen(items.at(3))).toBe(false);
  });

  it("renders 'Show answers' checkbox", () => {
    expect(wrapper.contains('[data-test="showAnswersCheckbox"]')).toBe(true);
  });

  it("doesn't render answers preview by default", () => {
    const items = getItems(wrapper);

    expect(isAnswersPreviewVisible(items.at(0))).toBe(false);
    expect(isAnswersPreviewVisible(items.at(1))).toBe(false);
    expect(isAnswersPreviewVisible(items.at(2))).toBe(false);
    expect(isAnswersPreviewVisible(items.at(3))).toBe(false);
  });

  it('renders answers preview on show answers click', () => {
    checkShowAnswers(wrapper);

    const items = getItems(wrapper);

    expect(isAnswersPreviewVisible(items.at(0))).toBe(true);
    expect(isAnswersPreviewVisible(items.at(1))).toBe(true);
    expect(isAnswersPreviewVisible(items.at(2))).toBe(true);
    expect(isAnswersPreviewVisible(items.at(3))).toBe(true);
  });

  it('opens an item on item click', () => {
    const items = getItems(wrapper);
    items.at(1).trigger('click');

    expect(isItemOpen(items.at(0))).toBe(false);
    expect(isItemOpen(items.at(1))).toBe(true);
    expect(isItemOpen(items.at(2))).toBe(false);
    expect(isItemOpen(items.at(3))).toBe(false);
  });

  it('opens an item on toolbar edit icon click', () => {
    const items = getItems(wrapper);
    clickEdit(items.at(1));

    expect(isItemOpen(items.at(0))).toBe(false);
    expect(isItemOpen(items.at(1))).toBe(true);
    expect(isItemOpen(items.at(2))).toBe(false);
    expect(isItemOpen(items.at(3))).toBe(false);
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

  describe('on "Delete" click', () => {
    beforeEach(() => {
      const items = getItems(wrapper);
      clickDelete(items.at(1));
    });

    it('emits delete item event with a correct item', () => {
      expect(wrapper.emitted().deleteItem).toBeTruthy();
      expect(wrapper.emitted().deleteItem.length).toBe(1);
      expect(wrapper.emitted().deleteItem[0][0]).toEqual(ITEM2);
    });

    it('emits update item events with updated order of items after the deleted item', () => {
      expect(wrapper.emitted().updateItem).toBeTruthy();
      expect(wrapper.emitted().updateItem.length).toBe(2);
      expect(wrapper.emitted().updateItem[0][0]).toEqual({
        ...ITEM3,
        order: 1,
      });

      expect(wrapper.emitted().updateItem).toBeTruthy();
      expect(wrapper.emitted().updateItem.length).toBe(2);
      expect(wrapper.emitted().updateItem[1][0]).toEqual({
        ...ITEM4,
        order: 2,
      });
    });
  });

  describe('on "Add question above" click', () => {
    beforeEach(() => {
      const items = getItems(wrapper);
      clickAddQuestionAbove(items.at(1));
    });

    it('emits add item event with a new item with a correct order', () => {
      expect(wrapper.emitted().addItem).toBeTruthy();
      expect(wrapper.emitted().addItem.length).toBe(1);
      expect(wrapper.emitted().addItem[0][0]).toEqual({
        contentnode: NODE_ID,
        question: '',
        type: AssessmentItemTypes.SINGLE_SELECTION,
        answers: [],
        hints: [],
        order: 1,
        isNew: true,
      });
    });

    it('emits update item events with updated order of items below the new item', () => {
      expect(wrapper.emitted().updateItem).toBeTruthy();
      expect(wrapper.emitted().updateItem.length).toBe(3);

      expect(wrapper.emitted().updateItem[0][0]).toEqual({
        ...ITEM2,
        order: 2,
      });
      expect(wrapper.emitted().updateItem[1][0]).toEqual({
        ...ITEM3,
        order: 3,
      });
      expect(wrapper.emitted().updateItem[2][0]).toEqual({
        ...ITEM4,
        order: 4,
      });
    });
  });

  describe('on "Add question below" click', () => {
    beforeEach(() => {
      const items = getItems(wrapper);
      clickAddQuestionBelow(items.at(1));
    });

    it('emits add item event with a new item with a correct order', () => {
      expect(wrapper.emitted().addItem).toBeTruthy();
      expect(wrapper.emitted().addItem.length).toBe(1);
      expect(wrapper.emitted().addItem[0][0]).toEqual({
        contentnode: NODE_ID,
        question: '',
        type: AssessmentItemTypes.SINGLE_SELECTION,
        answers: [],
        hints: [],
        order: 2,
        isNew: true,
      });
    });

    it('emits update item events with updated order of items below the new item', () => {
      expect(wrapper.emitted().updateItem).toBeTruthy();
      expect(wrapper.emitted().updateItem.length).toBe(2);

      expect(wrapper.emitted().updateItem[0][0]).toEqual({
        ...ITEM3,
        order: 3,
      });
      expect(wrapper.emitted().updateItem[1][0]).toEqual({
        ...ITEM4,
        order: 4,
      });
    });
  });

  describe('on "Move up" click', () => {
    beforeEach(() => {
      const items = getItems(wrapper);
      clickMoveUp(items.at(1));
    });

    it('emits update item events with updated order of affected items', () => {
      expect(wrapper.emitted().updateItem).toBeTruthy();
      expect(wrapper.emitted().updateItem.length).toBe(2);

      expect(wrapper.emitted().updateItem[0][0]).toEqual({
        ...ITEM2,
        order: 0,
      });
      expect(wrapper.emitted().updateItem[1][0]).toEqual({
        ...ITEM1,
        order: 1,
      });
    });
  });

  describe('on "Move down" click', () => {
    beforeEach(() => {
      const items = getItems(wrapper);
      clickMoveDown(items.at(1));
    });

    it('emits update item events with updated order of affected items', () => {
      expect(wrapper.emitted().updateItem).toBeTruthy();
      expect(wrapper.emitted().updateItem.length).toBe(2);

      expect(wrapper.emitted().updateItem[0][0]).toEqual({
        ...ITEM2,
        order: 2,
      });
      expect(wrapper.emitted().updateItem[1][0]).toEqual({
        ...ITEM3,
        order: 1,
      });
    });
  });

  describe('on "Add new question" click', () => {
    beforeEach(() => {
      clickNewQuestionBtn(wrapper);
    });

    it('emits add item event with a new item with a correct order', () => {
      expect(wrapper.emitted().addItem).toBeTruthy();
      expect(wrapper.emitted().addItem.length).toBe(1);
      expect(wrapper.emitted().addItem[0][0]).toEqual({
        contentnode: NODE_ID,
        question: '',
        type: AssessmentItemTypes.SINGLE_SELECTION,
        answers: [],
        hints: [],
        order: 4,
        isNew: true,
      });
    });
  });
});
