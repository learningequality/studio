import { render, screen, fireEvent, within, configure } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';

import { factory } from '../../store';
import { assessmentItemKey } from '../../utils';
import AssessmentItemEditor from './AssessmentItemEditor';
import { AssessmentItemTypes, ValidationErrors } from 'shared/constants';

jest.mock('shared/views/TipTapEditor/TipTapEditor/TipTapEditor.vue');

configure({
  testIdAttribute: 'data-test',
});

const store = factory();

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

const renderComponent = (props = {}) => {
  return render(AssessmentItemEditor, {
    store,
    routes: [],
    props: {
      nodeId: 'node-id',
      item: ITEM,
      ...props,
    },
  });
};

// Returns the payload of the most recent `update` event.
const lastUpdatePayload = emitted => {
  const updates = emitted().update;
  return updates[updates.length - 1][0];
};

// Opens the question editor (question starts collapsed in view mode) and returns its textbox.
const openQuestionEditor = async user => {
  await user.click(screen.getByTestId('questionText'));
  // Both the type dropdown and the answers expose textboxes, so target the question editor's.
  return screen.getAllByRole('textbox').find(el => el.tagName === 'TEXTAREA');
};

// Opens the response-type dropdown (by clicking its current value) and picks a new type.
const changeQuestionType = async (user, currentLabel, newLabel) => {
  const select = screen.getByTestId('kindSelect');
  await user.click(within(select).getByText(currentLabel));
  await user.click(await screen.findByText(newLabel));
};

describe('AssessmentItemEditor', () => {
  it('shows the response type, question, answers, and hints of the item', () => {
    renderComponent();

    expect(screen.getByText('Type')).toBeInTheDocument();
    expect(screen.getByText('Exercise 2 - Question 2')).toBeInTheDocument();
    expect(screen.getByText('Peanut butter')).toBeInTheDocument();
    expect(screen.getByText('Mayonnaise (I mean you can, but...)')).toBeInTheDocument();
  });

  it('lets the user edit the question and emits the updated question text', async () => {
    const user = userEvent.setup();
    const { emitted } = renderComponent();

    const questionEditor = await openQuestionEditor(user);
    await fireEvent.update(questionEditor, 'My new question');

    expect(lastUpdatePayload(emitted)).toEqual({
      ...assessmentItemKey(ITEM),
      question: 'My new question',
    });
  });

  describe('changing the question type', () => {
    it('keeps a single correct answer when switching to single choice', async () => {
      const item = {
        ...ITEM,
        type: AssessmentItemTypes.MULTIPLE_SELECTION,
        answers: [
          { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
          { answer: 'Peanut butter', correct: true, order: 2 },
        ],
      };
      const user = userEvent.setup();
      const { emitted } = renderComponent({ item });

      await changeQuestionType(user, 'Multiple choice', 'Single choice');

      expect(lastUpdatePayload(emitted)).toEqual({
        ...assessmentItemKey(item),
        type: AssessmentItemTypes.SINGLE_SELECTION,
        answers: [
          { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
          { answer: 'Peanut butter', correct: false, order: 2 },
        ],
      });
    });

    it('replaces the answers with True and False when switching to true or false', async () => {
      const item = {
        ...ITEM,
        type: AssessmentItemTypes.SINGLE_SELECTION,
        answers: [
          { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
          { answer: 'Peanut butter', correct: false, order: 2 },
        ],
      };
      const user = userEvent.setup();
      const { emitted } = renderComponent({ item });

      await changeQuestionType(user, 'Single choice', 'True/False');

      expect(lastUpdatePayload(emitted)).toEqual({
        ...assessmentItemKey(item),
        type: AssessmentItemTypes.TRUE_FALSE,
        answers: [
          { answer: 'True', order: 1, correct: true },
          { answer: 'False', order: 2, correct: false },
        ],
      });
    });

    it('marks every numeric answer as correct when switching to numeric input', async () => {
      const item = {
        ...ITEM,
        type: AssessmentItemTypes.SINGLE_SELECTION,
        answers: [
          { answer: '8', correct: true, order: 1 },
          { answer: '8.0', correct: false, order: 2 },
          { answer: '-400.19090', correct: false, order: 3 },
        ],
      };
      const user = userEvent.setup();
      const { emitted } = renderComponent({ item });

      await changeQuestionType(user, 'Single choice', 'Numeric input');

      expect(lastUpdatePayload(emitted)).toEqual({
        ...assessmentItemKey(item),
        type: AssessmentItemTypes.INPUT_QUESTION,
        answers: [
          { answer: '8', correct: true, order: 1 },
          { answer: '8.0', correct: true, order: 2 },
          { answer: '-400.19090', correct: true, order: 3 },
        ],
      });
    });
  });

  it('emits the updated answers when the user changes which answer is correct', async () => {
    const item = {
      ...ITEM,
      type: AssessmentItemTypes.SINGLE_SELECTION,
      answers: [
        { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
        { answer: 'Peanut butter', correct: false, order: 2 },
      ],
    };
    const { emitted } = renderComponent({ item });

    // Selecting the second answer's correctness control makes it the correct one.
    const radios = screen.getAllByRole('radio');
    await fireEvent.click(radios[1]);

    expect(lastUpdatePayload(emitted)).toEqual({
      ...assessmentItemKey(item),
      answers: [
        { answer: 'Mayonnaise (I mean you can, but...)', correct: false, order: 1 },
        { answer: 'Peanut butter', correct: true, order: 2 },
      ],
    });
  });

  it('emits the updated hints when the user edits a hint', async () => {
    const user = userEvent.setup();
    const item = {
      ...ITEM,
      hints: [{ hint: 'Hint 1', order: 1 }],
    };
    const { emitted } = renderComponent({ item });

    // Open the collapsible hints section, then open the hint to edit it.
    await user.click(screen.getByRole('button', { name: /hints/i }));
    const hintCard = screen.getByTestId('hint');
    await user.click(hintCard);

    const hintEditor = within(screen.getByTestId('hint')).getByRole('textbox');
    await fireEvent.update(hintEditor, 'Updated hint');

    expect(lastUpdatePayload(emitted)).toEqual({
      ...assessmentItemKey(item),
      hints: [{ hint: 'Updated hint', order: 1 }],
    });
  });

  it('shows validation messages for an invalid item', () => {
    renderComponent({
      errors: [
        ValidationErrors.QUESTION_REQUIRED,
        ValidationErrors.INVALID_NUMBER_OF_CORRECT_ANSWERS,
      ],
    });

    expect(screen.getByText('Question is required')).toBeInTheDocument();
    expect(screen.getByText('Choose a correct answer')).toBeInTheDocument();
  });
});
