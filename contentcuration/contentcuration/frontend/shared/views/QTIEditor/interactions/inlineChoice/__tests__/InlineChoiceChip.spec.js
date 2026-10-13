import { nextTick, ref } from 'vue';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { qtiEditorStrings } from '../../../qtiEditorStrings';
import { CHIP, chip, findChip, renderPassage } from './renderPassage';
import { stubProseMirrorLayout } from 'shared/utils/testing';

// jsdom defines `ontouchstart`, which would put the editor in its touch layout.
jest.mock('shared/utils/browserInfo', () => ({ isTouchDevice: false }));

const getChip = () => screen.getByRole('button', CHIP);
const getChips = () => screen.getAllByRole('button', CHIP);

const chipPos = (editor, responseIdentifier) => findChip(editor, responseIdentifier).pos;

describe('InlineChoiceChip', () => {
  stubProseMirrorLayout();

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
      qtiEditorStrings.answerDropdownWithCorrect$({ count: 2, label: 'Moon' }),
    );
    expect(el).toHaveAccessibleName(/^Moon, /);
  });

  it.each([
    ['options have text but none is correct', [['a', 'Sun']], undefined, 1],
    ['no option has text', [['a', '']], undefined, 0],
    [
      'the correct option has blank text',
      [
        ['a', ' '],
        ['b', 'x'],
      ],
      'a',
      1,
    ],
  ])('prompts for answers when %s', async (_, options, correct, count) => {
    await renderPassage({ value: `<p>${chip('r1', options, correct)}</p>` });
    const el = getChip();
    expect(el).toHaveTextContent(`${count} ${qtiEditorStrings.addAnswers$()}`);
    expect(el).toHaveAccessibleName(
      qtiEditorStrings.answerDropdownNoCorrect$({ count, label: qtiEditorStrings.addAnswers$() }),
    );
  });

  it('is a button that opens a dialog, closed until opened', async () => {
    await renderPassage({ value: `<p>${chip('r1', [['a', 'x']], 'a')}</p>` });
    const el = getChip();
    expect(el).toHaveAttribute('type', 'button');
    expect(el).toHaveAttribute('aria-haspopup', 'dialog');
    expect(el).toHaveAttribute('aria-expanded', 'false');
  });

  it('is no Tab stop or popup while the passage is read-only, and a button once editable', async () => {
    const { openResponseIdentifier, setMode } = await renderPassage({
      value: `<p>a${chip('r1', [['a', 'x']], 'a')}</p>`,
      mode: 'view',
    });
    expect(screen.queryByRole('button', CHIP)).not.toBeInTheDocument();
    const el = screen.getByRole('img', CHIP);
    expect(el).not.toHaveAttribute('aria-expanded');
    await fireEvent.click(el);
    expect(openResponseIdentifier.value).toBeNull();

    setMode('edit');
    await waitFor(() => expect(getChip()).toHaveAttribute('aria-expanded', 'false'));
  });

  it('opens the clicked chip and closes the previously open one', async () => {
    const value = `<p>${chip('r1', [['a', 'x']], 'a')} ${chip('r2', [['b', 'y']], 'b')}</p>`;
    const { openResponseIdentifier } = await renderPassage({ value });
    const [first, second] = getChips();
    await userEvent.click(first);
    expect(openResponseIdentifier.value).toBe('r1');
    await waitFor(() => expect(first).toHaveAttribute('aria-expanded', 'true'));
    await userEvent.click(second);
    expect(openResponseIdentifier.value).toBe('r2');
    await waitFor(() => expect(second).toHaveAttribute('aria-expanded', 'true'));
    expect(first).toHaveAttribute('aria-expanded', 'false');
  });

  it.each(['{Enter}', ' '])('opens a focused chip with %s', async key => {
    const { editor, openResponseIdentifier } = await renderPassage({
      value: `<p>a${chip('r1', [['a', 'x']], 'a')}b</p>`,
    });
    const before = editor.getHTML();
    getChip().focus();
    await userEvent.keyboard(key);
    expect(openResponseIdentifier.value).toBe('r1');
    expect(editor.getHTML()).toBe(before);
  });

  it('is one Tab stop per chip, in reading order, after the editor', async () => {
    const value = `<p>a${chip('r1', [['a', 'x']], 'a')}</p><p>b${chip('r2', [['b', 'y']], 'b')}</p>`;
    const { editor } = await renderPassage({ value });
    const [first, second] = getChips();
    editor.view.dom.focus();
    await userEvent.tab();
    expect(first).toHaveFocus();
    await userEvent.tab();
    expect(second).toHaveFocus();
    await userEvent.tab();
    expect(editor.view.dom.contains(document.activeElement)).toBe(false);
  });

  // ProseMirror reads `keyCode`, which `userEvent.keyboard` does not set.
  const press = (editor, key, keyCode, init = {}) =>
    fireEvent.keyDown(editor.view.dom, { key, keyCode, ...init });

  it.each([
    ['ArrowRight', 39, 2],
    ['ArrowLeft', 37, 3],
  ])('does not open a chip reached with %s', async (key, keyCode, cursor) => {
    const { editor, openResponseIdentifier } = await renderPassage({
      value: `<p>a${chip('r1', [['c1', 'x']], 'c1')}b</p>`,
    });
    editor.commands.setTextSelection(cursor);
    press(editor, key, keyCode);
    expect(editor.state.selection.node).toBeDefined();
    await nextTick();
    expect(openResponseIdentifier.value).toBeNull();
    expect(getChip()).toHaveAttribute('aria-expanded', 'false');
  });

  it.each([
    ['Enter', 13],
    [' ', 32],
  ])('does not open a chip the caret is on when %p is pressed', async (key, keyCode) => {
    const { editor, openResponseIdentifier } = await renderPassage({
      value: `<p>a${chip('r1', [['c1', 'x']], 'c1')}b</p>`,
    });
    editor.commands.setNodeSelection(chipPos(editor, 'r1'));
    press(editor, key, keyCode);
    await nextTick();
    expect(openResponseIdentifier.value).toBeNull();
  });

  it('deletes a keyboard-selected chip with Backspace and restores it with undo', async () => {
    const { editor } = await renderPassage({
      value: `<p>a${chip('r1', [['c1', 'x']], 'c1')}b</p>`,
    });
    editor.commands.setTextSelection(2);
    press(editor, 'ArrowRight', 39);
    press(editor, 'Backspace', 8);
    await waitFor(() => expect(screen.queryByRole('button', CHIP)).not.toBeInTheDocument());
    press(editor, 'z', 90, { ctrlKey: true });
    await waitFor(() => expect(getChip()).toHaveTextContent('1 x'));
  });

  it('focuses a chip by its response identifier, or the editor once it is gone', async () => {
    const value = `<p>a${chip('r1', [['a', 'x']], 'a')} ${chip('r2', [['b', 'y']], 'b')}</p>`;
    const { editor, focusChip } = await renderPassage({ value });
    focusChip('r2');
    expect(getChips()[1]).toHaveFocus();

    editor.commands.setNodeSelection(chipPos(editor, 'r2'));
    editor.commands.deleteSelection();
    focusChip('r2');
    await waitFor(() => expect(editor.view.dom).toHaveFocus());
  });

  it('ignores focusing a chip once the editor is gone', async () => {
    const { focusChip } = await renderPassage({ value: `<p>${chip('r1', [['a', 'x']], 'a')}</p>` });
    cleanup();
    expect(() => focusChip('r1')).not.toThrow();
    expect(() => focusChip('gone')).not.toThrow();
  });

  it('outlines a node-selected chip without opening it', async () => {
    const { editor, openResponseIdentifier } = await renderPassage({
      value: `<p>a${chip('r1', [['c1', 'x']], 'c1')}b</p>`,
    });
    editor.commands.setNodeSelection(chipPos(editor, 'r1'));
    await waitFor(() => expect(getChip()).toHaveClass('is-selected'));
    expect(openResponseIdentifier.value).toBeNull();

    editor.commands.setTextSelection(1);
    await waitFor(() => expect(getChip()).not.toHaveClass('is-selected'));
  });

  // The open chip's panel (#6182) sits outside the editor; using it must not close the editor.
  // Relies on `useClickOutside`'s `hasOpenMenu` matching the chip's `aria-expanded` button.
  it('keeps the editor open on a click outside it while a chip is open', async () => {
    const { onMinimize } = await renderPassage({
      value: `<p>${chip('r1', [['a', 'x']], 'a')}</p>`,
    });
    await userEvent.click(getChip());
    await waitFor(() => expect(getChip()).toHaveAttribute('aria-expanded', 'true'));
    await userEvent.click(document.body);
    expect(onMinimize).not.toHaveBeenCalled();
  });

  it('shows errors while its response identifier is in the error list', async () => {
    const errorResponseIdentifiers = ref([]);
    await renderPassage({
      value: `<p>${chip('r1', [['a', 'x']], 'a')}</p>`,
      errorResponseIdentifiers,
    });
    const el = getChip();
    expect(el).not.toHaveClass('has-errors');
    expect(el).toHaveAccessibleName(
      qtiEditorStrings.answerDropdownWithCorrect$({ count: 1, label: 'x' }),
    );

    errorResponseIdentifiers.value = ['r1'];
    await nextTick();
    expect(el).toHaveClass('has-errors');
    expect(el).toHaveAccessibleName(
      qtiEditorStrings.answerDropdownWithCorrectNeedsAttention$({ count: 1, label: 'x' }),
    );

    errorResponseIdentifiers.value = [];
    await nextTick();
    expect(el).not.toHaveClass('has-errors');
    expect(el).toHaveAccessibleName(
      qtiEditorStrings.answerDropdownWithCorrect$({ count: 1, label: 'x' }),
    );
  });

  it('says a dropdown with no correct answer needs attention', async () => {
    await renderPassage({
      value: `<p>${chip('r1', [['a', '']])}</p>`,
      errorResponseIdentifiers: ['r1'],
    });
    expect(getChip()).toHaveAccessibleName(
      qtiEditorStrings.answerDropdownNoCorrectNeedsAttention$({
        count: 0,
        label: qtiEditorStrings.addAnswers$(),
      }),
    );
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
