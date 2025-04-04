import { shallowMount, mount } from '@vue/test-utils';

import { AssessmentItemToolbarActions } from '../../constants';
import { assessmentItemKey } from '../../utils';
import AssessmentEditor from './AssessmentEditor';
import { AssessmentItemTypes, ValidationErrors, DELAYED_VALIDATION } from 'shared/constants';

jest.mock('shared/views/MarkdownEditor/MarkdownEditor/MarkdownEditor.vue');
jest.mock('shared/views/MarkdownEditor/MarkdownViewer/MarkdownViewer.vue');

const NODE_ID = 'node-id';
const ITEM1 = {
  contentnode: NODE_ID,
  assessment_id: 'question-1',
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
  contentnode: NODE_ID,
  assessment_id: 'question-2',
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
  contentnode: NODE_ID,
  assessment_id: 'question-3',
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
  contentnode: NODE_ID,
  assessment_id: 'question-4',
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

const checkShowAnswers = async wrapper => {
  await wrapper.findComponent('[data-test="showAnswersCheckbox"]').trigger('click');
};

const getItems = wrapper => {
  return wrapper.findAllComponents('[data-test="item"]');
};

const isItemOpen = assessmentItemWrapper => {
  return assessmentItemWrapper.findComponent('[data-test="editor"]').exists();
};

const isAnswersPreviewVisible = assessmentItemWrapper => {
  return assessmentItemWrapper.findComponent('[data-test="item-answers-preview"]').exists();
};

const clickNewQuestionBtn = async wrapper => {
  await wrapper.findComponent('[data-test="newQuestionBtn"]').trigger('click');
};

const clickClose = async assessmentItemWrapper => {
  await assessmentItemWrapper.findComponent('[data-test="closeBtn"]').trigger('click');
};

const clickEdit = async assessmentItemWrapper => {
  await assessmentItemWrapper
    .findComponent(`[data-test="toolbarIcon-${AssessmentItemToolbarActions.EDIT_ITEM}"]`)
    .trigger('click');
};

const clickDelete = async assessmentItemWrapper => {
  await assessmentItemWrapper
    .findComponent(`[data-test="toolbarMenuItem-${AssessmentItemToolbarActions.DELETE_ITEM}"]`)
    .trigger('click');
};

const clickAddQuestionAbove = async assessmentItemWrapper => {
  await assessmentItemWrapper
    .findComponent(`[data-test="toolbarMenuItem-${AssessmentItemToolbarActions.ADD_ITEM_ABOVE}"]`)
    .trigger('click');
};

const clickAddQuestionBelow = async assessmentItemWrapper => {
  await assessmentItemWrapper
    .findComponent(`[data-test="toolbarMenuItem-${AssessmentItemToolbarActions.ADD_ITEM_BELOW}"]`)
    .trigger('click');
};

const clickMoveUp = async assessmentItemWrapper => {
  await assessmentItemWrapper
    .findComponent(`[data-test="toolbarIcon-${AssessmentItemToolbarActions.MOVE_ITEM_UP}"]`)
    .trigger('click');
};

const clickMoveDown = async assessmentItemWrapper => {
  await assessmentItemWrapper
    .findComponent(`[data-test="toolbarIcon-${AssessmentItemToolbarActions.MOVE_ITEM_DOWN}"]`)
    .trigger('click');
};

describe('AssessmentEditor', () => {
  let wrapper;
  const listeners = {
    deleteItem: jest.fn(),
    addItem: jest.fn(),
    updateItem: jest.fn(),
    updateItems: jest.fn(),
  };

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
      listeners,
    });
  });

  it('smoke test', () => {
    const wrapper = shallowMount(AssessmentEditor);

    expect(wrapper.exists()).toBe(true);
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
      expect(wrapper.html()).toContain('Exercise has no questions');
    });

    it("doesn't render 'Show answers' checkbox", () => {
      expect(wrapper.findComponent('[data-test="showAnswersCheckbox"]').exists()).toBe(false);
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
    expect(wrapper.findComponent('[data-test="showAnswersCheckbox"]').exists()).toBe(true);
  });

  it("doesn't render answers preview by default", () => {
    const items = getItems(wrapper);

    expect(isAnswersPreviewVisible(items.at(0))).toBe(false);
    expect(isAnswersPreviewVisible(items.at(1))).toBe(false);
    expect(isAnswersPreviewVisible(items.at(2))).toBe(false);
    expect(isAnswersPreviewVisible(items.at(3))).toBe(false);
  });

  it('renders answers preview on show answers click', async () => {
    await checkShowAnswers(wrapper);

    const items = getItems(wrapper);

    expect(isAnswersPreviewVisible(items.at(0))).toBe(true);
    expect(isAnswersPreviewVisible(items.at(1))).toBe(true);
    expect(isAnswersPreviewVisible(items.at(2))).toBe(true);
    expect(isAnswersPreviewVisible(items.at(3))).toBe(true);
  });

  it('opens an item on item click', async () => {
    const items = getItems(wrapper);
    await items.at(1).trigger('click');

    expect(isItemOpen(items.at(0))).toBe(false);
    expect(isItemOpen(items.at(1))).toBe(true);
    expect(isItemOpen(items.at(2))).toBe(false);
    expect(isItemOpen(items.at(3))).toBe(false);
  });

  it('opens an item on toolbar edit icon click', async () => {
    const items = getItems(wrapper);
    await clickEdit(items.at(1));

    expect(isItemOpen(items.at(0))).toBe(false);
    expect(isItemOpen(items.at(1))).toBe(true);
    expect(isItemOpen(items.at(2))).toBe(false);
    expect(isItemOpen(items.at(3))).toBe(false);
  });

  it('closes an item on close button click', async () => {
    // open an item at first
    const items = getItems(wrapper);
    await items.at(1).trigger('click');
    expect(isItemOpen(items.at(1))).toBe(true);

    // now close it
    await clickClose(items.at(1));
    expect(isItemOpen(items.at(1))).toBe(false);
  });

  describe('on "Delete" click', () => {
    beforeEach(async () => {
      jest.clearAllMocks();
      const items = getItems(wrapper);
      await clickDelete(items.at(1));
    });

    it('emits delete item event with a correct key', () => {
      expect(listeners.deleteItem).toHaveBeenCalledWith(ITEM2);
      expect(listeners.updateItems).toBeCalledTimes(1);
    });

    it('emits update item events with updated order of items after the deleted item', () => {
      expect(listeners.updateItems).toHaveBeenCalledWith([
        {
          ...assessmentItemKey(ITEM1),
          order: 0,
        },
        {
          ...assessmentItemKey(ITEM3),
          order: 1,
        },
        {
          ...assessmentItemKey(ITEM4),
          order: 2,
        },
      ]);
      expect(listeners.updateItems).toBeCalledTimes(1);
    });
  });

  describe('on "Add question above" click', () => {
    beforeEach(async () => {
      jest.clearAllMocks();
      const items = getItems(wrapper);
      await clickAddQuestionAbove(items.at(1));
    });

    it('emits add item event with a new item with a correct order', () => {
      expect(listeners.addItem).toBeCalledWith({
        contentnode: NODE_ID,
        question: '',
        type: AssessmentItemTypes.SINGLE_SELECTION,
        answers: [],
        hints: [],
        order: 1,
        [DELAYED_VALIDATION]: true,
      });
    });

    it('emits update item events with updated order of items below the new item', () => {
      expect(listeners.updateItems).toHaveBeenCalledWith([
        {
          ...assessmentItemKey(ITEM1),
          order: 0,
        },
        {
          ...assessmentItemKey(ITEM2),
          order: 2,
        },
        {
          ...assessmentItemKey(ITEM3),
          order: 3,
        },
        {
          ...assessmentItemKey(ITEM4),
          order: 4,
        },
      ]);
      expect(listeners.updateItems).toBeCalledTimes(1);
    });
  });

  describe('on "Add question below" click', () => {
    beforeEach(async () => {
      jest.clearAllMocks();
      const items = getItems(wrapper);
      await clickAddQuestionBelow(items.at(1));
    });

    it('emits add item event with a new item with a correct order', () => {
      expect(listeners.addItem).toHaveBeenCalledWith({
        contentnode: NODE_ID,
        question: '',
        type: AssessmentItemTypes.SINGLE_SELECTION,
        answers: [],
        hints: [],
        order: 2,
        [DELAYED_VALIDATION]: true,
      });
      expect(listeners.addItem).toBeCalledTimes(1);
    });

    it('emits update item events with updated order of items below the new item', () => {
      expect(listeners.updateItems).toHaveBeenCalledWith([
        {
          ...assessmentItemKey(ITEM1),
          order: 0,
        },
        {
          ...assessmentItemKey(ITEM2),
          order: 1,
        },
        {
          ...assessmentItemKey(ITEM3),
          order: 3,
        },
        {
          ...assessmentItemKey(ITEM4),
          order: 4,
        },
      ]);
      expect(listeners.updateItems).toBeCalledTimes(1);
    });
  });

  describe('on "Move up" click', () => {
    beforeEach(async () => {
      jest.clearAllMocks();
      const items = getItems(wrapper);
      await clickMoveUp(items.at(1));
    });

    it('emits update item events with updated order of affected items', () => {
      expect(listeners.updateItems).toHaveBeenCalledWith([
        {
          ...assessmentItemKey(ITEM2),
          order: 0,
        },
        {
          ...assessmentItemKey(ITEM1),
          order: 1,
        },
      ]);
      expect(listeners.updateItems).toBeCalledTimes(1);
    });
  });

  describe('on "Move down" click', () => {
    beforeEach(async () => {
      jest.clearAllMocks();
      const items = getItems(wrapper);
      await clickMoveDown(items.at(1));
    });

    it('emits update item events with updated order of affected items', () => {
      expect(listeners.updateItems).toHaveBeenCalledWith([
        {
          ...assessmentItemKey(ITEM2),
          order: 2,
        },
        {
          ...assessmentItemKey(ITEM3),
          order: 1,
        },
      ]);
      expect(listeners.updateItems).toBeCalledTimes(1);
    });
  });

  describe('on "Add new question" click', () => {
    beforeEach(async () => {
      await clickNewQuestionBtn(wrapper);
    });

    it('emits add item event with a new item with a correct order', () => {
      expect(listeners.addItem).toBeCalledWith({
        contentnode: NODE_ID,
        question: '',
        type: AssessmentItemTypes.SINGLE_SELECTION,
        answers: [],
        hints: [],
        order: 4,
        [DELAYED_VALIDATION]: true,
      });
    });
  });
});
