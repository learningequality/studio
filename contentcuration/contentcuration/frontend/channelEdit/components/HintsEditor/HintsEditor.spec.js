import { render, screen, within, configure } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';

import { AssessmentItemToolbarActions } from '../../constants';
import HintsEditor from './HintsEditor';

jest.mock('shared/views/TipTapEditor/TipTapEditor/TipTapEditor.vue');

configure({
  testIdAttribute: 'data-test',
});

const renderComponent = props => {
  return render(HintsEditor, {
    routes: [],
    props: {
      hints: [],
      ...props,
    },
  });
};

const getHintCards = () => {
  return screen.getAllByTestId('hint');
};

const clickToolbarAction = async ({ action, hintIdx, user }) => {
  const buttons = screen.getAllByTestId(`toolbarIcon-${action}`);
  expect(buttons[hintIdx]).toBeInTheDocument();
  await user.click(buttons[hintIdx]);
};

describe('HintsEditor', () => {
  it('smoke test', () => {
    renderComponent();

    expect(
      screen.getByRole('button', { name: HintsEditor.$trs.newHintBtnLabel }),
    ).toBeInTheDocument();
  });

  it('shows an empty-state message when a question has no hints', () => {
    renderComponent({
      hints: [],
    });

    expect(screen.getByText(HintsEditor.$trs.noHintsPlaceholder)).toBeInTheDocument();
  });

  it('shows hints in the same order as the question', () => {
    renderComponent({
      hints: [
        { hint: 'First hint', order: 1 },
        { hint: 'Second hint', order: 2 },
      ],
    });

    const hintCards = getHintCards();
    expect(within(hintCards[0]).getByText('First hint')).toBeInTheDocument();
    expect(within(hintCards[1]).getByText('Second hint')).toBeInTheDocument();
  });

  it('lets the user update the text of the currently open hint', async () => {
    const user = userEvent.setup();
    const { emitted } = renderComponent({
      hints: [
        { hint: 'First hint', order: 1 },
        { hint: 'Second hint', order: 2 },
      ],
      openHintIdx: 1,
    });

    const hintCards = getHintCards();
    const hintTextField = within(hintCards[1]).getByRole('textbox');

    await user.clear(hintTextField);
    await user.type(hintTextField, 'Updated hint');

    const updateEvents = emitted().update;
    expect(updateEvents[updateEvents.length - 1][0]).toEqual([
      { hint: 'First hint', order: 1 },
      { hint: 'Updated hint', order: 2 },
    ]);
  });

  it('adds a new hint and removes existing empty hints when the user clicks New hint', async () => {
    const user = userEvent.setup();
    const { emitted } = renderComponent({
      hints: [
        { hint: 'First hint', order: 1 },
        { hint: '', order: 2 },
        { hint: 'Third hint', order: 3 },
      ],
    });

    await user.click(screen.getByRole('button', { name: HintsEditor.$trs.newHintBtnLabel }));

    expect(emitted().update).toHaveLength(1);
    expect(emitted().update[0][0]).toEqual([
      { hint: 'First hint', order: 1 },
      { hint: 'Third hint', order: 2 },
      { hint: '', order: 3 },
    ]);
    expect(emitted().open).toHaveLength(1);
    expect(emitted().open[0][0]).toBe(2);
  });

  it('opens a different hint when the user clicks that hint card', async () => {
    const user = userEvent.setup();
    const { emitted } = renderComponent({
      hints: [
        { hint: 'First hint', order: 1 },
        { hint: 'Second hint', order: 2 },
      ],
      openHintIdx: 0,
    });

    const hintCards = getHintCards();
    await user.click(hintCards[1]);

    expect(emitted().open).toHaveLength(1);
    expect(emitted().open[0][0]).toBe(1);
  });

  it('moves a hint up and keeps the same hint open after moving', async () => {
    const user = userEvent.setup();
    const { emitted } = renderComponent({
      hints: [
        { hint: 'First hint', order: 1 },
        { hint: 'Second hint', order: 2 },
      ],
      openHintIdx: 1,
    });

    await clickToolbarAction({
      action: AssessmentItemToolbarActions.MOVE_ITEM_UP,
      hintIdx: 1,
      user,
    });

    expect(emitted().update).toHaveLength(1);
    expect(emitted().update[0][0]).toEqual([
      { hint: 'Second hint', order: 1 },
      { hint: 'First hint', order: 2 },
    ]);
    expect(emitted().open).toHaveLength(1);
    expect(emitted().open[0][0]).toBe(0);
  });

  it('keeps track of the open hint when the user moves the hint below it upward', async () => {
    const user = userEvent.setup();
    const { emitted } = renderComponent({
      hints: [
        { hint: 'First hint', order: 1 },
        { hint: 'Second hint', order: 2 },
      ],
      openHintIdx: 0,
    });

    await clickToolbarAction({
      action: AssessmentItemToolbarActions.MOVE_ITEM_UP,
      hintIdx: 1,
      user,
    });

    expect(emitted().open).toHaveLength(1);
    expect(emitted().open[0][0]).toBe(1);
  });

  it('moves a hint down and keeps the same hint open after moving', async () => {
    const user = userEvent.setup();
    const { emitted } = renderComponent({
      hints: [
        { hint: 'First hint', order: 1 },
        { hint: 'Second hint', order: 2 },
      ],
      openHintIdx: 0,
    });

    await clickToolbarAction({
      action: AssessmentItemToolbarActions.MOVE_ITEM_DOWN,
      hintIdx: 0,
      user,
    });

    expect(emitted().update).toHaveLength(1);
    expect(emitted().update[0][0]).toEqual([
      { hint: 'Second hint', order: 1 },
      { hint: 'First hint', order: 2 },
    ]);
    expect(emitted().open).toHaveLength(1);
    expect(emitted().open[0][0]).toBe(1);
  });

  it('keeps track of the open hint when the user moves the hint above it downward', async () => {
    const user = userEvent.setup();
    const { emitted } = renderComponent({
      hints: [
        { hint: 'First hint', order: 1 },
        { hint: 'Second hint', order: 2 },
      ],
      openHintIdx: 1,
    });

    await clickToolbarAction({
      action: AssessmentItemToolbarActions.MOVE_ITEM_DOWN,
      hintIdx: 0,
      user,
    });

    expect(emitted().open).toHaveLength(1);
    expect(emitted().open[0][0]).toBe(0);
  });

  it('deletes a hint and closes the editor when that hint was open', async () => {
    const user = userEvent.setup();
    const { emitted } = renderComponent({
      hints: [
        { hint: 'First hint', order: 1 },
        { hint: 'Second hint', order: 2 },
      ],
      openHintIdx: 0,
    });

    await clickToolbarAction({
      action: AssessmentItemToolbarActions.DELETE_ITEM,
      hintIdx: 0,
      user,
    });

    expect(emitted().update).toHaveLength(1);
    expect(emitted().update[0][0]).toEqual([{ hint: 'Second hint', order: 1 }]);
    expect(emitted().close).toHaveLength(1);
  });

  it('keeps track of the open hint when the user deletes a hint above it', async () => {
    const user = userEvent.setup();
    const { emitted } = renderComponent({
      hints: [
        { hint: 'First hint', order: 1 },
        { hint: 'Second hint', order: 2 },
      ],
      openHintIdx: 1,
    });

    await clickToolbarAction({
      action: AssessmentItemToolbarActions.DELETE_ITEM,
      hintIdx: 0,
      user,
    });

    expect(emitted().open).toHaveLength(1);
    expect(emitted().open[0][0]).toBe(0);
  });
});
