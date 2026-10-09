import { nextTick } from 'vue';
import { fireEvent, screen, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import useKLiveRegion from 'kolibri-design-system/lib/composables/useKLiveRegion';
import { qtiEditorStrings } from '../../../qtiEditorStrings';
import { getDropdowns } from '../parse';
import { CHIP, chip, renderPassage } from './renderPassage';
import { stubProseMirrorLayout } from 'shared/utils/testing';

// jsdom defines `ontouchstart`, which would put the editor in its touch layout.
jest.mock('shared/utils/browserInfo', () => ({ isTouchDevice: false }));
// KDS reads the window as small until it has measured it, which would swap Insert for its icon
// button after the first render.
jest.mock('kolibri-design-system/lib/composables/useKResponsiveWindow', () => {
  const { ref } = require('vue');
  return {
    __esModule: true,
    default: () => ({ windowIsSmall: ref(false) }),
  };
});

jest.mock('kolibri-design-system/lib/composables/useKLiveRegion', () => {
  const sendAssertiveMessage = jest.fn();
  return {
    __esModule: true,
    default: () => ({ sendPoliteMessage: jest.fn(), sendAssertiveMessage }),
  };
});

const dropdowns = editor => getDropdowns(editor.getHTML());

const chipHTML = ({ responseIdentifier, options, correctId }) =>
  chip(
    responseIdentifier,
    options.map(option => [option.id, option.text]),
    correctId,
  );

// The handler only trusts the selection once the author has focused the editor.
async function renderAt(value, from, to = from, passageOptions = {}) {
  const rendered = await renderPassage({ value, ...passageOptions });
  rendered.editor.view.dom.focus();
  rendered.editor.commands.setTextSelection({ from, to });
  await nextTick();
  return rendered;
}

const ORIGINAL = {
  responseIdentifier: 'r1',
  options: [{ id: 'a', text: 'x' }],
  correctId: 'a',
};

const INSERT = { name: qtiEditorStrings.insertInlineChoice$() };

const clickInsert = () => userEvent.click(screen.getByRole('button', INSERT));

describe('useInlineChoicePassage Insert action', () => {
  stubProseMirrorLayout();

  it('inserts a blank chip at the cursor and opens it', async () => {
    const { editor, openResponseIdentifier } = await renderAt('<p>The rises</p>', 5);
    await clickInsert();

    expect(dropdowns(editor)).toHaveLength(1);
    const [dropdown] = dropdowns(editor);
    expect(dropdown.options).toEqual([{ id: expect.any(String), text: '' }]);
    expect(dropdown.correctId).toBeNull();
    expect(editor.getHTML()).toBe(`<p>The ${chipHTML(dropdown)}rises</p>`);
    expect(openResponseIdentifier.value).toBe(dropdown.responseIdentifier);
    const el = await screen.findByRole('button', CHIP);
    expect(el).toHaveTextContent(`0 ${qtiEditorStrings.addAnswers$()}`);
    await waitFor(() => expect(el).toHaveAttribute('aria-expanded', 'true'));
  });

  it.each([
    ['a code block', '<p>a</p><pre><code>xyz</code></pre>'],
    ['an image', '<p>a</p><img src="x.png">'],
  ])(
    'puts the cursor after a chip inserted at the end of a passage ending in %s',
    async (_, value) => {
      const { editor } = await renderPassage({ value });
      await clickInsert();
      editor.commands.insertContent('Z');

      const [dropdown] = dropdowns(editor);
      expect(editor.getHTML()).toContain(`<p>${chipHTML(dropdown)}Z</p>`);
    },
  );

  it('closes the open dropdown when its chip leaves the passage', async () => {
    const { editor, openResponseIdentifier } = await renderAt('<p>The rises</p>', 5);
    await clickInsert();
    expect(openResponseIdentifier.value).not.toBeNull();

    editor.commands.undo();
    expect(dropdowns(editor)).toEqual([]);
    expect(openResponseIdentifier.value).toBeNull();
  });

  it('turns highlighted text into a chip whose correct option is that text', async () => {
    const { editor, openResponseIdentifier } = await renderAt('<p>The Moon rises</p>', 5, 9);
    await clickInsert();

    expect(dropdowns(editor)).toHaveLength(1);
    const [dropdown] = dropdowns(editor);
    expect(dropdown.options).toEqual([{ id: expect.any(String), text: 'Moon' }]);
    expect(dropdown.correctId).toBe(dropdown.options[0].id);
    expect(editor.getHTML()).toBe(`<p>The ${chipHTML(dropdown)} rises</p>`);
    expect(openResponseIdentifier.value).toBe(dropdown.responseIdentifier);
    await waitFor(() =>
      expect(screen.getByRole('button', CHIP)).toHaveAttribute('aria-expanded', 'true'),
    );
  });

  it('drops the formatting of highlighted text', async () => {
    const { editor } = await renderAt('<p><strong>Mo</strong><em>on</em></p>', 1, 5);
    await clickInsert();

    expect(dropdowns(editor)).toHaveLength(1);
    const [dropdown] = dropdowns(editor);
    expect(dropdown.options[0].text).toBe('Moon');
    expect(editor.getHTML()).toBe(`<p>${chipHTML(dropdown)}</p>`);
  });

  it('leaves whitespace around the highlighted text in the passage', async () => {
    const { editor } = await renderAt('<p>The Moon rises</p>', 4, 10);
    await clickInsert();

    expect(dropdowns(editor)).toHaveLength(1);
    const [dropdown] = dropdowns(editor);
    expect(dropdown.options[0].text).toBe('Moon');
    expect(editor.getHTML()).toBe(`<p>The ${chipHTML(dropdown)} rises</p>`);
  });

  it('turns a one-paragraph passage selected with select-all into a chip', async () => {
    const { editor } = await renderAt('<p>The Moon</p>', 1);
    editor.commands.selectAll();
    await nextTick();
    expect(screen.getByRole('button', INSERT)).not.toHaveAttribute('aria-disabled', 'true');
    await clickInsert();

    const [dropdown] = dropdowns(editor);
    expect(dropdown.options).toEqual([{ id: expect.any(String), text: 'The Moon' }]);
    expect(editor.getHTML()).toBe(`<p>${chipHTML(dropdown)}</p>`);
  });

  it('is unavailable while the selection spans paragraphs', async () => {
    const { editor } = await renderAt('<p>one</p><p>two</p>', 2, 7);
    await clickInsert();

    expect(screen.getByRole('button', INSERT)).toHaveAttribute('aria-disabled', 'true');
    expect(dropdowns(editor)).toEqual([]);
  });

  it('is unavailable where a chip cannot go', async () => {
    const { editor } = await renderAt('<pre><code>x</code></pre>', 1);
    await clickInsert();

    expect(screen.getByRole('button', INSERT)).toHaveAttribute('aria-disabled', 'true');
    expect(dropdowns(editor)).toEqual([]);
  });

  it('is available before focus when the passage starts where a chip cannot go', async () => {
    const { editor } = await renderPassage({ value: '<pre><code>x</code></pre><p>a</p>' });
    expect(screen.getByRole('button', INSERT)).not.toHaveAttribute('aria-disabled', 'true');
    await clickInsert();

    expect(dropdowns(editor)).toHaveLength(1);
  });

  it('keeps a chip inside the highlighted text and adds the new one after it', async () => {
    const { editor } = await renderAt(`<p>a ${chipHTML(ORIGINAL)} b</p>`, 1, 5);
    await clickInsert();

    const [first, second] = dropdowns(editor);
    expect(dropdowns(editor)).toHaveLength(2);
    expect(first).toEqual(ORIGINAL);
    expect(second.options).toEqual([{ id: expect.any(String), text: '' }]);
    expect(editor.getHTML()).toBe(`<p>a ${chipHTML(ORIGINAL)} ${chipHTML(second)}b</p>`);
  });
});

describe('useInlineChoicePassage announcements', () => {
  stubProseMirrorLayout();

  const { sendAssertiveMessage } = useKLiveRegion();
  beforeEach(() => sendAssertiveMessage.mockClear());

  /** Puts the caret where a test starts, leaving out what getting it there announced. */
  async function renderAnnouncerAt(...args) {
    const rendered = await renderAt(...args);
    sendAssertiveMessage.mockClear();
    return rendered;
  }

  const announced = () => sendAssertiveMessage.mock.calls.map(([message]) => message);

  // ProseMirror reads `keyCode`, which `userEvent.keyboard` does not set.
  const press = (editor, key, keyCode) => fireEvent.keyDown(editor.view.dom, { key, keyCode });

  const TWO_CHIPS = `<p>a${chip('r1', [['c1', 'x']], 'c1')}b${chip('r2', [
    ['c2', 'y'],
    ['c3', 'z'],
  ])}</p>`;

  it.each([
    ['forward', 2, 3],
    ['backward', 3, 2],
  ])('names a chip the caret moves %s across', async (_, from, to) => {
    const { editor } = await renderAnnouncerAt(TWO_CHIPS, from);
    editor.commands.setTextSelection(to);
    expect(announced()).toEqual([
      qtiEditorStrings.answerDropdownWithCorrect$({ label: 'x', count: 1 }),
    ]);
  });

  it('names a chip that needs attention as such', async () => {
    const { editor } = await renderAnnouncerAt(TWO_CHIPS, 4, 4, {
      errorResponseIdentifiers: ['r2'],
    });
    editor.commands.setTextSelection(5);
    expect(announced()).toEqual([
      qtiEditorStrings.answerDropdownNoCorrectNeedsAttention$({
        label: qtiEditorStrings.addAnswers$(),
        count: 2,
      }),
    ]);
  });

  it('says nothing about a caret move across text', async () => {
    const { editor } = await renderAnnouncerAt(TWO_CHIPS, 1);
    editor.commands.setTextSelection(2);
    expect(announced()).toEqual([]);
  });

  it('says which chip Backspace removed', async () => {
    const { editor } = await renderAnnouncerAt(TWO_CHIPS, 3);
    press(editor, 'Backspace', 8);
    expect(announced()).toEqual([qtiEditorStrings.answerDropdownRemoved$({ label: 'x' })]);
  });

  it('counts the chips removed together', async () => {
    const { editor } = await renderAnnouncerAt(TWO_CHIPS, 1, 6);
    editor.commands.deleteSelection();
    expect(announced()).toEqual([qtiEditorStrings.answerDropdownsRemoved$({ count: 2 })]);
  });

  // The options panel and a focused chip step through the passage's history from outside it.
  it('says which chip an undo or redo from outside the passage removed', async () => {
    const { editor, undo, redo } = await renderPassage({ value: TWO_CHIPS });
    editor.commands.deleteRange({ from: 2, to: 3 });
    undo();
    expect(announced()).toEqual([]);
    redo();
    expect(announced()).toEqual([qtiEditorStrings.answerDropdownRemoved$({ label: 'x' })]);
  });

  it('says so when an undo from a focused chip removes it', async () => {
    const user = userEvent.setup();
    const { editor } = await renderPassage({ value: '<p>ab</p>' });
    editor.chain().setTextSelection(2).insertInlineChoice('r1').run();
    screen.getByRole('button', CHIP).focus();

    await user.keyboard('{Control>}z{/Control}');
    expect(announced()).toEqual([
      qtiEditorStrings.answerDropdownRemoved$({ label: qtiEditorStrings.addAnswers$() }),
    ]);
  });

  it('says nothing about changes made while the passage is not focused', async () => {
    const { editor } = await renderPassage({ value: TWO_CHIPS });
    editor.commands.setTextSelection(2);
    editor.commands.setTextSelection(3);
    editor.commands.setContent('<p>ab</p>');
    expect(announced()).toEqual([]);
  });
});

describe('useInlineChoicePassage syncing', () => {
  stubProseMirrorLayout();

  const press = (editor, key, keyCode, init = {}) =>
    fireEvent.keyDown(editor.view.dom, { key, keyCode, ...init });

  const VALUE = `<p>a${chip('r1', [['c1', 'x']], 'c1')}b</p>`;

  async function renderSynced() {
    const onChange = jest.fn();
    const rendered = await renderPassage({ value: VALUE, onChange });
    rendered.editor.view.dom.focus();
    return { ...rendered, onChange };
  }

  it('reports the passage when a chip is removed, with no chip open', async () => {
    const { editor, onChange } = await renderSynced();
    editor.commands.setTextSelection(3);
    press(editor, 'Backspace', 8);
    expect(onChange).toHaveBeenLastCalledWith('<p>ab</p>');
  });

  it('reports the passage when undo restores a removed chip', async () => {
    const { editor, onChange } = await renderSynced();
    editor.commands.setTextSelection(3);
    press(editor, 'Backspace', 8);
    press(editor, 'z', 90, { ctrlKey: true });
    expect(dropdowns(editor)).toHaveLength(1);
    expect(onChange).toHaveBeenLastCalledWith(editor.getHTML());
  });

  it('reports the passage when undo changes a closed chip’s options', async () => {
    const { editor, onChange } = await renderSynced();
    editor.commands.updateInlineChoice('r1', { correctId: null });
    onChange.mockClear();
    press(editor, 'z', 90, { ctrlKey: true });
    expect(dropdowns(editor)[0].correctId).toBe('c1');
    expect(onChange).toHaveBeenLastCalledWith(editor.getHTML());
  });

  it('leaves typing that changes no chip to be reported on blur', async () => {
    const { editor, onChange } = await renderSynced();
    editor.commands.insertContentAt(1, 'z');
    expect(onChange).not.toHaveBeenCalled();
  });
});
