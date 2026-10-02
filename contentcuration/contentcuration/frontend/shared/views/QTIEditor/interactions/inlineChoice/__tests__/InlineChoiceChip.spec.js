import { nextTick } from 'vue';
import { fireEvent, screen, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { qtiEditorStrings } from '../../../qtiEditorStrings';
import { CHIP, chip, findChip, renderPassage } from './renderPassage';
import { stubProseMirrorLayout } from 'shared/utils/testing';

// jsdom defines `ontouchstart`, which would put the editor in its touch layout.
jest.mock('shared/utils/browserInfo', () => ({ isTouchDevice: false }));

const getChip = () => screen.getByRole('img', CHIP);
const getChips = () => screen.getAllByRole('img', CHIP);

const chipPos = (editor, responseIdentifier) => findChip(editor, responseIdentifier).pos;

describe('InlineChoiceChip', () => {
  stubProseMirrorLayout();
  afterEach(() => delete document.elementFromPoint);

  it('shows the correct option text and counts only options with text', async () => {
    const value = `<p>${chip(
      'r1',
      [
        ['a', 'Sun'],
        ['b', ' '],
        ['c', 'Moon'],
        ['d', ''],
      ],
      'c',
    )}</p>`;
    await renderPassage({ value });
    const el = getChip();
    expect(el).toHaveTextContent('2 Moon');
    expect(el).toHaveAccessibleName(
      qtiEditorStrings.answerDropdownWithCorrect$({ count: 2, answer: 'Moon' }),
    );
  });

  it('prompts for an answer when options have text but none is correct', async () => {
    await renderPassage({ value: `<p>${chip('r1', [['a', 'Sun']])}</p>` });
    const el = getChip();
    expect(el).toHaveTextContent(`1 ${qtiEditorStrings.addAnswer$()}`);
    expect(el).toHaveAccessibleName(qtiEditorStrings.answerDropdownNoCorrect$({ count: 1 }));
  });

  it('prompts for answers when no option has text', async () => {
    await renderPassage({ value: `<p>${chip('r1', [['a', '']])}</p>` });
    const el = getChip();
    expect(el).toHaveTextContent(`0 ${qtiEditorStrings.addAnswers$()}`);
    expect(el).toHaveAccessibleName(qtiEditorStrings.answerDropdownNoCorrect$({ count: 0 }));
  });

  it('treats a correct option with blank text as having no answer', async () => {
    await renderPassage({
      value: `<p>${chip(
        'r1',
        [
          ['a', ' '],
          ['b', 'x'],
        ],
        'a',
      )}</p>`,
    });
    expect(getChip()).toHaveTextContent(`1 ${qtiEditorStrings.addAnswer$()}`);
  });

  it('marks the clicked chip current and clears the previous one', async () => {
    const value = `<p>${chip('r1', [['a', 'x']], 'a')} ${chip('r2', [['b', 'y']], 'b')}</p>`;
    const { editor, selectedResponseIdentifier } = await renderPassage({ value });
    const [first, second] = getChips();
    // jsdom has no layout; point ProseMirror at the clicked chip. Without coordinates it can
    // only resolve the first one, so the second is selected as the click would.
    document.elementFromPoint = () => first;
    await userEvent.click(first);
    await waitFor(() => expect(first).toHaveAttribute('aria-current', 'true'));
    expect(selectedResponseIdentifier.value).toBe('r1');
    editor.commands.setNodeSelection(chipPos(editor, 'r2'));
    await waitFor(() => expect(second).toHaveAttribute('aria-current', 'true'));
    expect(first).not.toHaveAttribute('aria-current');
    expect(selectedResponseIdentifier.value).toBe('r2');
  });

  // ProseMirror reads `keyCode`, which `userEvent.keyboard` does not set.
  const press = (editor, key, keyCode, init = {}) =>
    fireEvent.keyDown(editor.view.dom, { key, keyCode, ...init });

  it.each([
    ['ArrowRight', 39, 2],
    ['ArrowLeft', 37, 3],
  ])('selects a chip reached with %s', async (key, keyCode, cursor) => {
    const { editor, selectedResponseIdentifier } = await renderPassage({
      value: `<p>a${chip('r1', [['c1', 'x']], 'c1')}b</p>`,
    });
    editor.commands.setTextSelection(cursor);
    press(editor, key, keyCode);
    await waitFor(() => expect(getChip()).toHaveAttribute('aria-current', 'true'));
    expect(selectedResponseIdentifier.value).toBe('r1');
  });

  it('deletes a keyboard-selected chip with Backspace and restores it with undo', async () => {
    const { editor } = await renderPassage({
      value: `<p>a${chip('r1', [['c1', 'x']], 'c1')}b</p>`,
    });
    editor.commands.setTextSelection(2);
    press(editor, 'ArrowRight', 39);
    press(editor, 'Backspace', 8);
    await waitFor(() => expect(screen.queryByRole('img', CHIP)).not.toBeInTheDocument());
    press(editor, 'z', 90, { ctrlKey: true });
    await waitFor(() => expect(getChip()).toHaveTextContent('1 x'));
  });

  it('selects a still node-selected chip again when clicked after the selection was cleared', async () => {
    const { editor, selectedResponseIdentifier, selectDropdown } = await renderPassage({
      value: `<p>${chip('r1', [['a', 'x']], 'a')}</p>`,
    });
    editor.commands.setNodeSelection(chipPos(editor, 'r1'));
    await waitFor(() => expect(selectedResponseIdentifier.value).toBe('r1'));
    selectDropdown(null);
    const el = getChip();
    document.elementFromPoint = () => el;
    await userEvent.click(el);
    expect(selectedResponseIdentifier.value).toBe('r1');
  });

  it('keeps the selected dropdown when a text range covers chips', async () => {
    const value = `<p>a${chip('r1', [['a', 'x']], 'a')} b ${chip('r2', [['b', 'y']], 'b')} c</p>`;
    const { editor, selectedResponseIdentifier } = await renderPassage({ value });
    editor.commands.setNodeSelection(chipPos(editor, 'r1'));
    await waitFor(() => expect(selectedResponseIdentifier.value).toBe('r1'));
    editor.commands.setTextSelection({ from: 1, to: editor.state.doc.content.size - 1 });
    await nextTick();
    expect(selectedResponseIdentifier.value).toBe('r1');
    const [first, second] = getChips();
    expect(first).toHaveAttribute('aria-current', 'true');
    expect(second).not.toHaveAttribute('aria-current');
  });

  it('updates the label in place when the dropdown changes', async () => {
    const { editor } = await renderPassage({ value: `<p>${chip('r1', [['a', 'x']], 'a')}</p>` });
    const el = getChip();
    editor.commands.updateInlineChoice('r1', {
      options: [
        { id: 'a', text: 'x' },
        { id: 'b', text: 'y' },
      ],
      correctId: 'b',
    });
    await waitFor(() => expect(el).toHaveTextContent('2 y'));
    expect(getChip()).toBe(el);
  });
});
