import { nextTick } from 'vue';
import { fireEvent, screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import useKLiveRegion from 'kolibri-design-system/lib/composables/useKLiveRegion';
import { qtiEditorStrings } from '../../../qtiEditorStrings';
import { findGap, gap, gapIdentifiers, input, renderPassage } from './renderPassage';
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

const { insertGap$, gapWithAnswer$, gapEmpty$, gapRemoved$, gapsRemoved$ } = qtiEditorStrings;

const INSERT = { name: insertGap$() };

const clickInsert = () => userEvent.click(screen.getByRole('button', INSERT));

// ProseMirror reads `keyCode`, which `userEvent.keyboard` does not set.
const press = (editor, key, keyCode) => fireEvent.keyDown(editor.view.dom, { key, keyCode });

const newGap = editor => {
  const [identifier] = gapIdentifiers(editor).filter(id => id !== 'gap_a');
  return findGap(editor, identifier);
};

// The handler only trusts the selection once the author has focused the editor.
async function renderAt(value, from, to = from, passageOptions = {}) {
  const rendered = await renderPassage({ value, ...passageOptions });
  rendered.editor.view.dom.focus();
  rendered.editor.commands.setTextSelection({ from, to });
  await nextTick();
  return rendered;
}

describe('useGapMatchPassage Insert action', () => {
  stubProseMirrorLayout();

  it('inserts a blank gap at the cursor, with the cursor inside it', async () => {
    const { editor } = await renderAt('<p>The rises</p>', 5);
    await clickInsert();

    const { node, pos } = newGap(editor);
    expect(editor.getHTML()).toBe(`<p>The ${gap(node.attrs.identifier)}rises</p>`);
    expect(editor.state.selection.from).toBe(pos + 1);
  });

  it('adds a blank gap at the end of a passage not yet focused', async () => {
    const { editor } = await renderPassage({ value: '<p>The Sun</p>' });
    await clickInsert();

    const { node } = newGap(editor);
    expect(editor.getHTML()).toBe(`<p>The Sun${gap(node.attrs.identifier)}</p>`);
    expect(editor.state.selection.$from.parent).toBe(node);
  });

  it('turns highlighted text into a gap whose answer is that text, keeping its formatting', async () => {
    const { editor } = await renderAt('<p>The <strong>Sun</strong> rises</p>', 5, 8);
    await clickInsert();

    const { node } = newGap(editor);
    expect(editor.getHTML()).toBe(
      `<p>The ${gap(node.attrs.identifier, '<strong>Sun</strong>')} rises</p>`,
    );
  });

  it('leaves whitespace around the highlighted text in the passage', async () => {
    const { editor } = await renderAt('<p>The Sun rises</p>', 4, 9);
    await clickInsert();

    const { node } = newGap(editor);
    expect(editor.getHTML()).toBe(`<p>The ${gap(node.attrs.identifier, 'Sun')} rises</p>`);
  });

  it('turns a one-paragraph passage selected with select-all into a gap', async () => {
    const { editor } = await renderAt('<p>The Moon</p>', 1);
    editor.commands.selectAll();
    await nextTick();
    await clickInsert();

    const { node } = newGap(editor);
    expect(editor.getHTML()).toBe(`<p>${gap(node.attrs.identifier, 'The Moon')}</p>`);
  });

  it('is unavailable while the selection spans paragraphs', async () => {
    const { editor } = await renderAt('<p>one</p><p>two</p>', 2, 7);
    await clickInsert();

    expect(screen.getByRole('button', INSERT)).toHaveAttribute('aria-disabled', 'true');
    expect(gapIdentifiers(editor)).toEqual([]);
  });

  it('is unavailable inside a gap', async () => {
    const { editor } = await renderAt(`<p>a${gap('gap_a', 'xy')}b</p>`, 4);
    await clickInsert();

    expect(screen.getByRole('button', INSERT)).toHaveAttribute('aria-disabled', 'true');
    expect(gapIdentifiers(editor)).toEqual(['gap_a']);
  });

  it('is unavailable over a selection holding a gap', async () => {
    const { editor } = await renderAt(`<p>a${gap('gap_a', 'xy')}b</p>`, 1, 7);
    await clickInsert();

    expect(screen.getByRole('button', INSERT)).toHaveAttribute('aria-disabled', 'true');
    expect(gapIdentifiers(editor)).toEqual(['gap_a']);
  });

  it('is unavailable over a select-all holding a gap', async () => {
    const value = `<p>The ${gap('gap_a', 'Sun')} rises</p>`;
    const { editor } = await renderAt(value, 1);
    editor.commands.selectAll();
    await nextTick();
    await clickInsert();

    expect(screen.getByRole('button', INSERT)).toHaveAttribute('aria-disabled', 'true');
    expect(editor.getHTML()).toBe(value);
  });

  it('is unavailable over a select-all holding a line break', async () => {
    const { editor } = await renderAt('<p>one<br>two</p>', 1);
    editor.commands.selectAll();
    await nextTick();
    await clickInsert();

    expect(screen.getByRole('button', INSERT)).toHaveAttribute('aria-disabled', 'true');
    expect(gapIdentifiers(editor)).toEqual([]);
  });
});

describe('useGapMatchPassage announcements', () => {
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

  // <p>a[gap_a: x]b[gap_b]</p>: gap_a's answer is at 3, gap_b's inside at 7.
  const TWO_GAPS = `<p>a${gap('gap_a', 'x')}b${gap('gap_b')}</p>`;

  it('names a gap the caret enters', async () => {
    const { editor } = await renderAnnouncerAt(TWO_GAPS, 2);
    editor.commands.setTextSelection(3);
    expect(announced()).toEqual([gapWithAnswer$({ answer: 'x', number: 1 })]);
  });

  it('says nothing about a caret move within a gap or across text', async () => {
    const { editor } = await renderAnnouncerAt(TWO_GAPS, 3);
    editor.commands.setTextSelection(4);
    editor.commands.setTextSelection(1);
    expect(announced()).toEqual([]);
  });

  it('says which gap Backspace removed', async () => {
    const { editor } = await renderAnnouncerAt(TWO_GAPS, 7);
    press(editor, 'Backspace', 8);
    expect(announced()).toEqual([gapRemoved$({ name: gapEmpty$({ number: 2 }) })]);
  });

  it('counts the gaps removed together', async () => {
    const { editor } = await renderAnnouncerAt(TWO_GAPS, 1);
    editor.commands.deleteRange({ from: 1, to: editor.state.doc.content.size - 1 });
    expect(announced()).toEqual([gapsRemoved$({ count: 2 })]);
  });
});

describe('useGapMatchPassage syncing', () => {
  stubProseMirrorLayout();

  const VALUE = `<p>a${gap('gap_a', 'x')}b</p>`;

  async function renderSynced() {
    const onChange = jest.fn();
    const rendered = await renderPassage({ value: VALUE, onChange });
    rendered.editor.view.dom.focus();
    return { ...rendered, onChange };
  }

  it('reports the passage as an answer is typed', async () => {
    const { editor, onChange } = await renderSynced();
    editor.commands.setTextSelection(4);
    input(editor, 'insertText', 'y');
    expect(onChange).toHaveBeenLastCalledWith(`<p>a${gap('gap_a', 'xy')}b</p>`);
  });

  it('reports the passage when a gap is removed', async () => {
    const { editor, onChange } = await renderSynced();
    editor.commands.deleteRange({ from: 2, to: 5 });
    expect(onChange).toHaveBeenLastCalledWith('<p>ab</p>');
  });

  it('leaves typing outside the gaps to be reported on blur', async () => {
    const { editor, onChange } = await renderSynced();
    editor.commands.insertContentAt(1, 'z');
    expect(onChange).not.toHaveBeenCalled();
  });
});
