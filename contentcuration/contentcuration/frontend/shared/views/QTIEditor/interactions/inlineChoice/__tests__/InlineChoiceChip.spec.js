import { nextTick, ref } from 'vue';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
// The resolver does not read package `exports` subpaths.
// eslint-disable-next-line import/no-unresolved
import { NodeSelection } from '@tiptap/pm/state';
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
    ['Backspace', 8, 3],
    ['Delete', 46, 2],
  ])('removes the chip beside the caret with %s', async (key, keyCode, cursor) => {
    const { editor } = await renderPassage({
      value: `<p>a${chip('r1', [['c1', 'x']], 'c1')}b</p>`,
    });
    editor.commands.setTextSelection(cursor);
    press(editor, key, keyCode);
    expect(editor.getHTML()).toBe('<p>ab</p>');
  });

  // ProseMirror moves the caret past an inline node it cannot select, rather than onto it.
  it('cannot be selected on its own, so the caret moves past it', async () => {
    const { editor } = await renderPassage({
      value: `<p>a${chip('r1', [['c1', 'x']], 'c1')}b</p>`,
    });
    expect(NodeSelection.isSelectable(findChip(editor, 'r1').node)).toBe(false);

    editor.commands.setTextSelection(2);
    press(editor, 'ArrowRight', 39);
    expect(editor.state.selection.empty).toBe(true);
    expect(editor.state.selection.head).toBe(3);
  });

  it.each([
    ['{ArrowRight}', 3],
    ['{ArrowLeft}', 2],
  ])('puts the caret beside a focused chip with %s', async (key, caret) => {
    const user = userEvent.setup();
    const { editor, openResponseIdentifier } = await renderPassage({
      value: `<p>a${chip('r1', [['c1', 'x']], 'c1')}b</p>`,
    });
    getChip().focus();
    await user.keyboard(key);

    await waitFor(() => expect(editor.view.dom).toHaveFocus());
    expect(editor.state.selection.empty).toBe(true);
    expect(editor.state.selection.head).toBe(caret);
    expect(openResponseIdentifier.value).toBeNull();
  });

  it('puts the caret by the text direction in right-to-left text', async () => {
    const user = userEvent.setup();
    const { editor } = await renderPassage({
      value: `<p dir="rtl">a${chip('r1', [['c1', 'x']], 'c1')}b</p>`,
    });
    const chipEl = getChip();
    const { getComputedStyle } = window;
    const spy = jest
      .spyOn(window, 'getComputedStyle')
      .mockImplementation((el, ...rest) =>
        el === chipEl ? { direction: 'rtl' } : getComputedStyle.call(window, el, ...rest),
      );
    try {
      chipEl.focus();
      await user.keyboard('{ArrowLeft}');
    } finally {
      spy.mockRestore();
    }

    await waitFor(() => expect(editor.view.dom).toHaveFocus());
    expect(editor.state.selection.head).toBe(3);
  });

  it('leaves a focused chip with a modified arrow key alone', async () => {
    const user = userEvent.setup();
    const { editor } = await renderPassage({
      value: `<p>a${chip('r1', [['c1', 'x']], 'c1')}b</p>`,
    });
    getChip().focus();
    await user.keyboard('{Shift>}{ArrowRight}{/Shift}');
    expect(getChip()).toHaveFocus();
    expect(editor.view.dom).not.toHaveFocus();
  });

  // The chip keeps its keys from ProseMirror, so it runs the passage's history shortcuts itself.
  it.each([
    ['Ctrl+Shift+Z', '{Control>}{Shift>}z{/Shift}{/Control}'],
    ['Ctrl+Y', '{Control>}y{/Control}'],
  ])('undoes with Ctrl+Z and redoes with %s while focused', async (_, redoKeys) => {
    const user = userEvent.setup();
    const { editor } = await renderPassage({ value: `<p>${chip('r1', [['a', 'x']], 'a')}</p>` });
    editor.commands.updateInlineChoice('r1', {
      options: [
        { id: 'a', text: 'x' },
        { id: 'b', text: 'y' },
      ],
      correctId: 'b',
    });
    await waitFor(() => expect(getChip()).toHaveTextContent('2 y'));
    getChip().focus();

    await user.keyboard('{Control>}z{/Control}');
    await waitFor(() => expect(getChip()).toHaveTextContent('1 x'));
    expect(getChip()).toHaveFocus();

    await user.keyboard(redoKeys);
    await waitFor(() => expect(getChip()).toHaveTextContent('2 y'));
    expect(getChip()).toHaveFocus();
  });

  // As the passage's keymap does, by the key's place when the layout gives a non-Latin letter.
  it('undoes and redoes by the key’s place on a non-Latin keyboard layout', async () => {
    const { editor } = await renderPassage({ value: `<p>${chip('r1', [['a', 'x']], 'a')}</p>` });
    editor.commands.updateInlineChoice('r1', { correctId: null });
    await waitFor(() => expect(getChip()).not.toHaveTextContent('x'));
    const press = init => fireEvent.keyDown(getChip(), { ctrlKey: true, ...init });

    await press({ key: 'я', keyCode: 90 });
    await waitFor(() => expect(getChip()).toHaveTextContent('x'));
    await press({ key: 'Я', keyCode: 90, shiftKey: true });
    await waitFor(() => expect(getChip()).not.toHaveTextContent('x'));
    await press({ key: 'я', keyCode: 90 });
    await waitFor(() => expect(getChip()).toHaveTextContent('x'));
    await press({ key: 'н', keyCode: 89 });
    await waitFor(() => expect(getChip()).not.toHaveTextContent('x'));
  });

  // jsdom is no Mac, so the passage's `Mod` is Ctrl, and Cmd+Z is no shortcut there.
  it('leaves alone a history key the passage would not take', async () => {
    const user = userEvent.setup();
    const { editor } = await renderPassage({ value: `<p>${chip('r1', [['a', 'x']], 'a')}</p>` });
    editor.commands.updateInlineChoice('r1', { correctId: null });
    await waitFor(() => expect(getChip()).not.toHaveTextContent('x'));
    getChip().focus();

    await user.keyboard('{Meta>}z{/Meta}');
    expect(editor.can().undo()).toBe(true);
    expect(getChip()).not.toHaveTextContent('x');
  });

  it('puts focus in the passage when an undo takes the focused chip away', async () => {
    const user = userEvent.setup();
    const { editor } = await renderPassage({ value: '<p>ab</p>' });
    editor.chain().setTextSelection(2).insertInlineChoice('r1').run();
    getChip().focus();

    await user.keyboard('{Control>}z{/Control}');
    expect(screen.queryByRole('button', CHIP)).not.toBeInTheDocument();
    await waitFor(() => expect(editor.view.dom).toHaveFocus());
  });

  it('marks the chips a text selection covers, so the highlight can cover them', async () => {
    const { editor } = await renderPassage({
      value: `<p>a${chip('r1', [['c1', 'x']], 'c1')}b${chip('r2', [['c2', 'y']], 'c2')}</p>`,
    });
    editor.commands.setTextSelection({ from: 1, to: 4 });
    const [first, second] = getChips();
    await waitFor(() => expect(first).toHaveClass('is-selected'));
    expect(second).not.toHaveClass('is-selected');

    editor.commands.setTextSelection(1);
    await waitFor(() => expect(first).not.toHaveClass('is-selected'));
  });

  it('deletes a chip with Backspace and restores it with undo', async () => {
    const { editor } = await renderPassage({
      value: `<p>a${chip('r1', [['c1', 'x']], 'c1')}b</p>`,
    });
    editor.commands.setTextSelection(3);
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

  // The open chip's panel (#6182) sits outside the editor; using it must not close the editor.
  // The editor stays open while a trigger inside it has an expanded popup; see "Popups outside
  // the editor" in docs/rich_text_editor.md.
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
