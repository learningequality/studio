import { shallowMount, mount } from '@vue/test-utils';

import {
  AssessmentItemTypes,
  AssessmentItemValidationErrors,
  AssessmentItemToolbarActions,
} from '../../constants';
import AssessmentEditor from './AssessmentEditor';

jest.mock('../MarkdownEditor/MarkdownEditor.vue');

const ASSESSMENT_DRAFT = [
  {
    data: {
      question: 'Question 1',
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
      question: 'Question 2',
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
];

const checkShowAnswers = wrapper => {
  wrapper
    .find('[data-test="showAnswersCheckbox"]')
    .find('input')
    .setChecked(true);
};

const getAssessmentItems = wrapper => {
  return wrapper.findAll('[data-test="item"]');
};

const isAssessmentItemOpen = assessmentItemWrapper => {
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
        assessmentDraft: ASSESSMENT_DRAFT,
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
          assessmentDraft: [],
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
    const assessmentItems = getAssessmentItems(wrapper);
    assessmentItems.at(1).trigger('click');

    expect(isAssessmentItemOpen(assessmentItems.at(0))).toBe(false);
    expect(isAssessmentItemOpen(assessmentItems.at(1))).toBe(true);
    expect(isAssessmentItemOpen(assessmentItems.at(2))).toBe(false);
  });

  it('opens an item on toolbar edit icon click', () => {
    const assessmentItems = getAssessmentItems(wrapper);
    clickEdit(assessmentItems.at(1));

    expect(isAssessmentItemOpen(assessmentItems.at(0))).toBe(false);
    expect(isAssessmentItemOpen(assessmentItems.at(1))).toBe(true);
    expect(isAssessmentItemOpen(assessmentItems.at(2))).toBe(false);
  });

  it('closes an item on close button click', () => {
    // open an item at first
    const assessmentItems = getAssessmentItems(wrapper);
    assessmentItems.at(1).trigger('click');
    expect(isAssessmentItemOpen(assessmentItems.at(1))).toBe(true);

    // now close it
    clickClose(assessmentItems.at(1));
    expect(isAssessmentItemOpen(assessmentItems.at(1))).toBe(false);
  });

  it('emits update event with updated assessment draft on item "Delete" click', () => {
    const assessmentItems = getAssessmentItems(wrapper);

    clickDelete(assessmentItems.at(1));

    expect(wrapper.emitted().update).toBeTruthy();
    const lastUpdate = wrapper.emitted().update.length - 1;
    expect(wrapper.emitted().update[lastUpdate][0]).toEqual([
      {
        data: {
          question: 'Question 1',
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
        validation: {
          questionErrors: [AssessmentItemValidationErrors.BLANK_QUESTION],
          answersErrors: [],
        },
      },
    ]);
  });

  it('emits update event with updated assessment draft on item "Add question above" click', () => {
    const assessmentItems = getAssessmentItems(wrapper);

    clickAddQuestionAbove(assessmentItems.at(1));

    expect(wrapper.emitted().update).toBeTruthy();
    const lastUpdate = wrapper.emitted().update.length - 1;
    expect(wrapper.emitted().update[lastUpdate][0]).toEqual([
      {
        data: {
          question: 'Question 1',
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
          question: '',
          type: AssessmentItemTypes.SINGLE_SELECTION,
          order: 1,
          answers: [],
          hints: [],
        },
        validation: {
          questionErrors: [AssessmentItemValidationErrors.BLANK_QUESTION],
          answersErrors: [AssessmentItemValidationErrors.INVALID_NUMBER_OF_CORRECT_ANSWERS],
        },
      },
      {
        data: {
          question: 'Question 2',
          type: AssessmentItemTypes.SINGLE_SELECTION,
          order: 2,
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
          order: 3,
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
    ]);
  });

  it('emits update event with updated assessment draft on item "Add question below" click', () => {
    const assessmentItems = getAssessmentItems(wrapper);

    clickAddQuestionBelow(assessmentItems.at(1));

    expect(wrapper.emitted().update).toBeTruthy();
    const lastUpdate = wrapper.emitted().update.length - 1;
    expect(wrapper.emitted().update[lastUpdate][0]).toEqual([
      {
        data: {
          question: 'Question 1',
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
          question: 'Question 2',
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
          type: AssessmentItemTypes.SINGLE_SELECTION,
          order: 2,
          answers: [],
          hints: [],
        },
        validation: {
          questionErrors: [AssessmentItemValidationErrors.BLANK_QUESTION],
          answersErrors: [AssessmentItemValidationErrors.INVALID_NUMBER_OF_CORRECT_ANSWERS],
        },
      },
      {
        data: {
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
        validation: {
          questionErrors: [AssessmentItemValidationErrors.BLANK_QUESTION],
          answersErrors: [],
        },
      },
    ]);
  });

  it('emits update event with updated assessment draft on item "Move up" click', () => {
    const assessmentItems = getAssessmentItems(wrapper);

    clickMoveUp(assessmentItems.at(1));

    expect(wrapper.emitted().update).toBeTruthy();
    const lastUpdate = wrapper.emitted().update.length - 1;
    expect(wrapper.emitted().update[lastUpdate][0]).toEqual([
      {
        data: {
          question: 'Question 2',
          type: AssessmentItemTypes.SINGLE_SELECTION,
          order: 0,
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
          question: 'Question 1',
          type: AssessmentItemTypes.INPUT_QUESTION,
          order: 1,
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
    ]);
  });

  it('emits update event with updated assessment draft on item "Move down" click', () => {
    const assessmentItems = getAssessmentItems(wrapper);

    clickMoveDown(assessmentItems.at(1));

    expect(wrapper.emitted().update).toBeTruthy();
    const lastUpdate = wrapper.emitted().update.length - 1;
    expect(wrapper.emitted().update[lastUpdate][0]).toEqual([
      {
        data: {
          question: 'Question 1',
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
        validation: {
          questionErrors: [AssessmentItemValidationErrors.BLANK_QUESTION],
          answersErrors: [],
        },
      },
      {
        data: {
          question: 'Question 2',
          type: AssessmentItemTypes.SINGLE_SELECTION,
          order: 2,
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
    ]);
  });

  it('emits update event with updated assessment draft on new question button click', () => {
    clickNewQuestionBtn(wrapper);

    expect(wrapper.emitted().update).toBeTruthy();
    const lastUpdate = wrapper.emitted().update.length - 1;
    expect(wrapper.emitted().update[lastUpdate][0]).toEqual([
      {
        data: {
          question: 'Question 1',
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
          question: 'Question 2',
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
      {
        data: {
          question: '',
          type: AssessmentItemTypes.SINGLE_SELECTION,
          order: 3,
          answers: [],
          hints: [],
        },
        validation: {
          questionErrors: [AssessmentItemValidationErrors.BLANK_QUESTION],
          answersErrors: [AssessmentItemValidationErrors.INVALID_NUMBER_OF_CORRECT_ANSWERS],
        },
      },
    ]);
  });
});
