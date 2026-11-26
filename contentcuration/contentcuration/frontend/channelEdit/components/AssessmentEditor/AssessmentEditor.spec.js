import { shallowMount, mount } from '@vue/test-utils';

import { AssessmentItemToolbarActions } from '../../constants';
import { assessmentItemKey } from '../../utils';
import AssessmentEditor from './AssessmentEditor';
import { AssessmentItemTypes, ValidationErrors, DELAYED_VALIDATION } from 'shared/constants';

jest.mock('shared/views/TipTapEditor/TipTapEditor/TipTapEditor.vue');

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
    addItem: jest.fn(item => ({ ...item, assessment_id: 'new' })),
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

  it.each([
    { items: [] },
    { items: [{ ...ITEM1, contentnode: 'copy' }] },
    { items: [{ ...ITEM1, type: AssessmentItemTypes.QTI }] },
  ])('closes the active editor when its row is unavailable or locked (%j)', async ({ items }) => {
    await clickEdit(getItems(wrapper).at(0));
    await wrapper.setProps({ items });
    expect(wrapper.findComponent('[data-test="editor"]').exists()).toBe(false);
    expect(wrapper.emitted('questionOpen')).toEqual([[true], [false]]);
    expect(wrapper.emitted('updateItem')).toBeUndefined();
  });

  it('closes a new question when switching to another exercise with the same order', async () => {
    await wrapper.setProps({ items: [] });
    await wrapper.vm.addItem({});
    const draft = wrapper.vm.activeItem;
    const { order } = draft;
    await wrapper.setProps({
      nodeId: 'other',
      items: [{ ...ITEM1, order, contentnode: 'other' }],
    });
    expect(wrapper.findComponent('[data-test="editor"]').exists()).toBe(false);
    expect(wrapper.emitted('questionOpen')).toEqual([[true], [false]]);
    expect(wrapper.emitted('updateItem')).toEqual([
      [{ ...assessmentItemKey(draft), [DELAYED_VALIDATION]: false }],
    ]);
  });

  it('opens only the saved question when a QTI create shares its order', async () => {
    await wrapper.setProps({ items: [] });
    const locked = { ...ITEM1, type: AssessmentItemTypes.QTI, order: 0 };
    listeners.addItem.mockImplementationOnce(async item => {
      const saved = { ...item, assessment_id: 'new' };
      await wrapper.setProps({ items: [locked, saved] });
      return saved;
    });
    await wrapper.vm.addItem({});
    expect(wrapper.findAll('[data-test="editor"]')).toHaveLength(1);
    expect(wrapper.vm.activeItem.assessment_id).toBe('new');
  });

  it('does not open a new question after switching exercises during the write', async () => {
    let finishWrite;
    listeners.addItem.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          finishWrite = resolve;
        }),
    );
    const adding = wrapper.vm.addItem({});
    await Promise.resolve();
    await wrapper.setProps({ nodeId: 'other', items: [] });
    finishWrite();
    await adding;
    expect(wrapper.emitted('questionOpen')).toBeUndefined();
    expect(wrapper.vm.activeItem).toBeNull();
  });

  it('reports when a question opens and closes', async () => {
    const item = getItems(wrapper).at(0);
    await clickEdit(item);
    await clickClose(item);
    expect(wrapper.emitted('questionOpen')).toEqual([[true], [false]]);
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

    expect(items.at(0).findComponent({ name: 'RichTextEditor' }).props('value')).toBe(
      ITEM1.question,
    );
    expect(items.at(1).findComponent({ name: 'RichTextEditor' }).props('value')).toBe(
      ITEM2.question,
    );
    expect(items.at(2).findComponent({ name: 'RichTextEditor' }).props('value')).toBe(
      ITEM3.question,
    );
    expect(items.at(3).findComponent({ name: 'RichTextEditor' }).props('value')).toBe(
      ITEM4.question,
    );
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

  it.each(['QTI', AssessmentItemTypes.PERSEUS_QUESTION])(
    'locks editing for %s while retaining list operations',
    async type => {
      jest.clearAllMocks();
      const item = { ...ITEM2, type };
      await wrapper.setProps({ items: [ITEM1, item, ITEM3] });
      const card = getItems(wrapper).at(1);

      await card.trigger('click');
      expect(isItemOpen(card)).toBe(false);
      const editIcon = card.find(
        `[data-test="toolbarIcon-${AssessmentItemToolbarActions.EDIT_ITEM}"]`,
      );
      expect(editIcon.attributes('disabled')).toBeDefined();
      await clickEdit(card);
      expect(isItemOpen(card)).toBe(false);

      expect(wrapper.emitted('questionOpen')).toBeUndefined();

      await clickMoveUp(card);
      expect(listeners.updateItems).toHaveBeenCalledWith(
        expect.arrayContaining([{ ...assessmentItemKey(item), order: 0 }]),
      );
      await clickDelete(card);
      expect(listeners.deleteItem).toHaveBeenCalledWith(item);
      await clickAddQuestionAbove(card);
      expect(listeners.addItem).toHaveBeenLastCalledWith(expect.objectContaining({ order: 1 }));
      await clickAddQuestionBelow(card);
      expect(listeners.addItem).toHaveBeenLastCalledWith(expect.objectContaining({ order: 2 }));
    },
  );

  it('opens a legacy item with raw data', async () => {
    await wrapper.setProps({ items: [{ ...ITEM1, raw_data: '{}' }] });
    const card = getItems(wrapper).at(0);
    await card.trigger('click');
    expect(isItemOpen(card)).toBe(true);
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
      expect(listeners.updateItems).toHaveBeenCalledTimes(1);
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
      expect(listeners.updateItems).toHaveBeenCalledTimes(1);
    });
  });

  describe('on "Add question above" click', () => {
    beforeEach(async () => {
      jest.clearAllMocks();
      const items = getItems(wrapper);
      await clickAddQuestionAbove(items.at(1));
    });

    it('emits add item event with a new item with a correct order', () => {
      expect(listeners.addItem).toHaveBeenCalledWith({
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
      expect(listeners.updateItems).toHaveBeenCalledTimes(1);
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
      expect(listeners.addItem).toHaveBeenCalledTimes(1);
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
      expect(listeners.updateItems).toHaveBeenCalledTimes(1);
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
      expect(listeners.updateItems).toHaveBeenCalledTimes(1);
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
      expect(listeners.updateItems).toHaveBeenCalledTimes(1);
    });
  });

  describe('on "Add new question" click', () => {
    beforeEach(async () => {
      await clickNewQuestionBtn(wrapper);
    });

    it('emits add item event with a new item with a correct order', () => {
      expect(listeners.addItem).toHaveBeenCalledWith({
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
