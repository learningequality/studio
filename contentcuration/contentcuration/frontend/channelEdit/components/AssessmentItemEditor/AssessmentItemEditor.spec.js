import { shallowMount, mount } from '@vue/test-utils';

import { factory } from '../../store';
import { assessmentItemKey } from '../../utils';
import AssessmentItemEditor from './AssessmentItemEditor';
import { AssessmentItemTypes, ValidationErrors } from 'shared/constants';

const store = factory();

jest.mock('shared/views/MarkdownEditor/MarkdownEditor/MarkdownEditor.vue');
jest.mock('shared/views/MarkdownEditor/MarkdownViewer/MarkdownViewer.vue');

const listeners = {
  update: jest.fn(),
};

const ITEM = {
  contentnode: 'Exercise 2',
  assessment_id: 'Question 2',
  question: 'Exercise 2 - Question 2',
  type: AssessmentItemTypes.SINGLE_SELECTION,
  answers: [
    { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
    { answer: 'Peanut butter', correct: false, order: 2 },
  ],
  hints: [
    { hint: "It's not healthy", order: 1 },
    { hint: 'Tasty!', order: 2 },
  ],
};

const openQuestion = async wrapper => {
  await wrapper.findComponent('[data-test="questionText"]').trigger('click');
};

const updateQuestion = async (wrapper, newQuestionText) => {
  // only one editor is rendered at a time => "wrapper.find"
  wrapper.findComponent({ name: 'MarkdownEditor' }).vm.$emit('update', newQuestionText);
  await wrapper.vm.$nextTick();
};

const selectKind = async (wrapper, kind) => {
  const input = wrapper.findComponent('[data-test="kindSelect"]');
  await input.setValue(kind);
  await input.trigger('input', kind);
};

describe('AssessmentItemEditor', () => {
  let wrapper;

  it('smoke test', () => {
    const wrapper = shallowMount(AssessmentItemEditor);

    expect(wrapper.exists()).toBe(true);
  });

  it('renders question, answers and hints', () => {
    wrapper = mount(AssessmentItemEditor, {
      store,
      propsData: {
        item: ITEM,
      },
      listeners,
    });

    expect(wrapper.html()).toContain('Exercise 2 - Question 2');

    // expect(wrapper.html()).toContain('Mayonnaise (I mean you can, but...)');
    // expect(wrapper.html()).toContain('Peanut butter');

    // expect(wrapper.html()).toContain("It's not healthy");
    // expect(wrapper.html()).toContain('Tasty!');
  });

  describe('on question text update', () => {
    beforeEach(async () => {
      wrapper = mount(AssessmentItemEditor, {
        store,
        propsData: {
          item: ITEM,
        },
        listeners,
      });

      jest.clearAllMocks();

      await openQuestion(wrapper);
      await updateQuestion(wrapper, 'My new question');
    });

    it('emits update event with item containing updated question text', () => {
      expect(listeners.update).toHaveBeenCalledWith({
        ...assessmentItemKey(ITEM),
        question: 'My new question',
      });
    });
  });

  describe('on item type update', () => {
    describe('when changing to single selection', () => {
      beforeEach(async () => {
        const item = {
          ...ITEM,
          type: AssessmentItemTypes.MULTIPLE_SELECTION,
          answers: [
            { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
            { answer: 'Peanut butter', correct: true, order: 2 },
          ],
        };

        jest.clearAllMocks();

        wrapper = mount(AssessmentItemEditor, {
          store,
          propsData: {
            item,
          },
          listeners,
        });

        await selectKind(wrapper, AssessmentItemTypes.SINGLE_SELECTION);
      });

      it('emits update event with item containing updated answers and type', () => {
        expect(listeners.update).toHaveBeenCalledWith({
          ...assessmentItemKey(ITEM),
          answers: [
            { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
            { answer: 'Peanut butter', correct: false, order: 2 },
          ],
          type: AssessmentItemTypes.SINGLE_SELECTION,
        });
      });
    });

    describe('when changing to multiple selection', () => {
      beforeEach(async () => {
        const item = {
          ...ITEM,
          type: AssessmentItemTypes.SINGLE_SELECTION,
          answers: [
            { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
            { answer: 'Peanut butter', correct: false, order: 2 },
          ],
        };

        jest.clearAllMocks();

        wrapper = mount(AssessmentItemEditor, {
          store,
          propsData: {
            item,
          },
          listeners,
        });

        await selectKind(wrapper, AssessmentItemTypes.MULTIPLE_SELECTION);
      });

      it('emits update event with item containing same answers and type', () => {
        expect(listeners.update).toHaveBeenCalledWith({
          ...assessmentItemKey(ITEM),
          answers: [
            { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
            { answer: 'Peanut butter', correct: false, order: 2 },
          ],
          type: AssessmentItemTypes.MULTIPLE_SELECTION,
        });
      });
    });

    describe('when changing to true/false', () => {
      beforeEach(async () => {
        const item = {
          ...ITEM,
          type: AssessmentItemTypes.SINGLE_SELECTION,
          answers: [
            { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
            { answer: 'Peanut butter', correct: false, order: 2 },
          ],
        };

        jest.clearAllMocks();

        wrapper = mount(AssessmentItemEditor, {
          store,
          propsData: {
            item,
          },
          listeners,
        });

        await selectKind(wrapper, AssessmentItemTypes.TRUE_FALSE);
      });

      it('emits update event with item containing updated answers and type', () => {
        expect(listeners.update).toHaveBeenCalledWith({
          ...assessmentItemKey(ITEM),
          answers: [
            { answer: 'True', order: 1, correct: true },
            { answer: 'False', order: 2, correct: false },
          ],
          type: AssessmentItemTypes.TRUE_FALSE,
        });
      });
    });

    describe('when changing to input question', () => {
      beforeEach(async () => {
        const item = {
          ...ITEM,
          type: AssessmentItemTypes.SINGLE_SELECTION,
          answers: [
            { answer: '8', correct: true, order: 1 },
            { answer: '8.0', correct: false, order: 2 },
            { answer: '-400.19090', correct: false, order: 3 },
            { answer: '-140140104', correct: false, order: 4 },
          ],
        };

        jest.clearAllMocks();

        wrapper = mount(AssessmentItemEditor, {
          store,
          propsData: {
            item,
          },
          listeners,
        });

        await selectKind(wrapper, AssessmentItemTypes.INPUT_QUESTION);
      });

      it('emits update event with item containing updated answers and type', () => {
        expect(listeners.update).toHaveBeenCalledWith({
          ...assessmentItemKey(ITEM),
          answers: [
            { answer: '8', correct: true, order: 1 },
            { answer: '8.0', correct: true, order: 2 },
            { answer: '-400.19090', correct: true, order: 3 },
            { answer: '-140140104', correct: true, order: 4 },
          ],
          type: AssessmentItemTypes.INPUT_QUESTION,
        });
      });
    });
  });

  describe('on answers update', () => {
    beforeEach(async () => {
      const item = {
        ...ITEM,
        type: AssessmentItemTypes.SINGLE_SELECTION,
        answers: [
          { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
          { answer: 'Peanut butter', correct: false, order: 2 },
        ],
      };

      jest.clearAllMocks();

      wrapper = mount(AssessmentItemEditor, {
        store,
        propsData: {
          item,
        },
        listeners,
      });

      const newAnswers = [
        { answer: 'Mayonnaise (I mean you can, but...)', correct: false, order: 1 },
        { answer: 'Peanut butter', correct: false, order: 2 },
      ];

      wrapper.findComponent({ name: 'AnswersEditor' }).vm.$emit('update', newAnswers);
      await wrapper.vm.$nextTick();
    });

    it('emits update event with an item containing updated answers', () => {
      expect(listeners.update).toHaveBeenCalledWith({
        ...assessmentItemKey(ITEM),
        answers: [
          { answer: 'Mayonnaise (I mean you can, but...)', correct: false, order: 1 },
          { answer: 'Peanut butter', correct: false, order: 2 },
        ],
      });
    });
  });

  describe('on hints update', () => {
    beforeEach(async () => {
      jest.clearAllMocks();
      const item = {
        ...ITEM,
        hints: [{ hint: 'Hint 1', order: 1 }],
      };

      wrapper = mount(AssessmentItemEditor, {
        store,
        propsData: {
          item,
        },
        listeners,
      });

      const newHints = [
        { hint: 'Hint 1', order: 1 },
        { hint: 'Hint 2', order: 2 },
      ];

      wrapper.findComponent({ name: 'HintsEditor' }).vm.$emit('update', newHints);
      await wrapper.vm.$nextTick();
    });

    it('emits update event with item containing updated hints', () => {
      expect(listeners.update).toHaveBeenCalledWith({
        ...assessmentItemKey(ITEM),
        hints: [
          { hint: 'Hint 1', order: 1 },
          { hint: 'Hint 2', order: 2 },
        ],
      });
    });
  });

  describe('for an invalid item', () => {
    beforeEach(() => {
      const item = { ...ITEM };
      const errors = [
        ValidationErrors.QUESTION_REQUIRED,
        ValidationErrors.INVALID_NUMBER_OF_CORRECT_ANSWERS,
      ];

      wrapper = mount(AssessmentItemEditor, {
        store,
        propsData: {
          item,
          errors,
        },
        listeners,
      });
    });

    it('renders all errors messages', () => {
      expect(wrapper.findComponent('[data-test=questionErrors]').html()).toContain(
        'Question is required',
      );
      expect(wrapper.findComponent('[data-test=answersErrors]').html()).toContain(
        'Choose a correct answer',
      );
    });
  });
});
