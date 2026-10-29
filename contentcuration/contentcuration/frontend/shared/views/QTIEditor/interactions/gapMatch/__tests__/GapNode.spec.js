import { findGap, gap, gapIdentifiers, input, press, renderPassage } from './renderPassage';
import { stubProseMirrorLayout } from 'shared/utils/testing';

// jsdom defines `ontouchstart`, which would put the editor in its touch layout.
jest.mock('shared/utils/browserInfo', () => ({ isTouchDevice: false }));

// jsdom has no ClipboardEvent, which `pasteHTML` creates by default.
const paste = (editor, html) => editor.view.pasteHTML(html, new Event('paste'));

const caret = editor => editor.state.selection.$from;

const isInGap = editor => caret(editor).parent.type.name === 'gap';

const answerOf = (editor, identifier) => findGap(editor, identifier).node.textContent;

// <p>ab[gap_a: xy]cd</p>: the gap starts at 3, its answer runs from 4 to 6, and 7 is after it.
const PASSAGE = `<p>ab${gap('gap_a', 'xy', 'choice_a')}cd</p>`;
const BEFORE_GAP = 3;
const ANSWER_START = 4;
const ANSWER_END = 6;
const AFTER_GAP = 7;

async function renderAt(pos, value = PASSAGE) {
  const { editor } = await renderPassage({ value });
  editor.commands.setTextSelection(pos);
  return editor;
}

describe('GapNode', () => {
  stubProseMirrorLayout();

  it('returns passage HTML with gaps unchanged', async () => {
    const value =
      `<p>Snow in ${gap('gap_a', 'winter', 'choice_a')}, sun in ` +
      `${gap('gap_b', '<strong>summer</strong>')} and ${gap('gap_c')}.</p>`;
    const { editor } = await renderPassage({ value });

    expect(editor.getHTML()).toBe(value);
  });

  describe('insertGap', () => {
    it('inserts a blank gap at the cursor, with the cursor inside it', async () => {
      const editor = await renderAt(2);

      editor.commands.insertGap();

      const inserted = gapIdentifiers(editor).find(identifier => identifier !== 'gap_a');
      expect(findGap(editor, inserted).pos).toBe(2);
      expect(findGap(editor, inserted).node.content.size).toBe(0);
      expect(isInGap(editor)).toBe(true);
    });

    it('makes the content its answer, with its marks, and puts the cursor at its end', async () => {
      const editor = await renderAt(1);

      editor.commands.insertGap([{ type: 'text', text: 'new', marks: [{ type: 'bold' }] }]);

      const [inserted] = gapIdentifiers(editor);
      expect(editor.getHTML()).toContain(`${gap(inserted, '<strong>new</strong>')}ab`);
      expect(caret(editor).pos).toBe(1 + 1 + 'new'.length);
    });
  });

  describe('typing', () => {
    it('types into a blank gap', async () => {
      const editor = await renderAt(1);
      editor.commands.insertGap();

      input(editor, 'insertText', 'z');

      const [inserted] = gapIdentifiers(editor);
      expect(answerOf(editor, inserted)).toBe('z');
    });

    it('types at the start of an answer into the gap', async () => {
      const editor = await renderAt(ANSWER_START);

      input(editor, 'insertText', 'z');

      expect(answerOf(editor, 'gap_a')).toBe('zxy');
    });

    it('types at the end of an answer into the gap', async () => {
      const editor = await renderAt(ANSWER_END);

      input(editor, 'insertText', 'z');

      expect(answerOf(editor, 'gap_a')).toBe('xyz');
    });

    it('types beside a gap outside it', async () => {
      const editor = await renderAt(AFTER_GAP);

      input(editor, 'insertText', 'z');

      expect(answerOf(editor, 'gap_a')).toBe('xy');
      expect(editor.getText()).toBe('abxyzcd');
    });

    it('keeps a gap blank when its last character is deleted', async () => {
      const editor = await renderAt(5, `<p>ab${gap('gap_a', 'x')}cd</p>`);

      input(editor, 'deleteContentBackward', null, { from: 4, to: 5 });

      expect(findGap(editor, 'gap_a').node.content.size).toBe(0);
      expect(isInGap(editor)).toBe(true);
    });

    it('keeps a gap blank when a word delete empties its answer', async () => {
      const editor = await renderAt(ANSWER_END);

      input(editor, 'deleteWordBackward', null, { from: ANSWER_START, to: ANSWER_END });

      expect(findGap(editor, 'gap_a').node.content.size).toBe(0);
      expect(isInGap(editor)).toBe(true);
    });

    it('deletes only the answer when a line delete reaches past the gap', async () => {
      const editor = await renderAt(ANSWER_END);

      input(editor, 'deleteSoftLineBackward', null, { from: 1, to: ANSWER_END });

      expect(findGap(editor, 'gap_a').node.content.size).toBe(0);
      expect(editor.getText()).toBe('abcd');
    });

    it('keeps a gap blank when a delete removes its whole answer selected', async () => {
      const editor = await renderAt({ from: ANSWER_START, to: ANSWER_END });

      input(editor, 'deleteSoftLineBackward');

      expect(findGap(editor, 'gap_a').node.content.size).toBe(0);
      expect(isInGap(editor)).toBe(true);
    });

    it('leaves to the browser a delete of part of a selected answer', async () => {
      const editor = await renderAt({ from: 5, to: ANSWER_END });

      const unhandled = input(editor, 'deleteSoftLineBackward');

      expect(unhandled).toBe(true);
    });

    it('leaves to the browser a delete that keeps part of the answer', async () => {
      const editor = await renderAt(ANSWER_END);

      const unhandled = input(editor, 'deleteWordBackward', null, { from: 5, to: ANSWER_END });

      expect(unhandled).toBe(true);
    });

    it('keeps the caret outside a gap when Backspace stops just after it', async () => {
      const editor = await renderAt(AFTER_GAP + 1, `<p>ab${gap('gap_a', 'xy')}Zcd</p>`);

      input(editor, 'deleteContentBackward', null, { from: AFTER_GAP, to: AFTER_GAP + 1 });
      input(editor, 'insertText', 'Q');

      expect(answerOf(editor, 'gap_a')).toBe('xy');
      expect(editor.getText()).toBe('abxyQcd');
    });

    it('keeps the caret outside a gap when Delete stops just after it', async () => {
      const editor = await renderAt(AFTER_GAP);

      input(editor, 'deleteContentForward', null, { from: AFTER_GAP, to: AFTER_GAP + 1 });
      input(editor, 'insertText', 'Q');

      expect(answerOf(editor, 'gap_a')).toBe('xy');
      expect(editor.getText()).toBe('abxyQd');
    });

    it('keeps the caret outside a gap when Delete stops just before it', async () => {
      const editor = await renderAt(BEFORE_GAP - 1);

      input(editor, 'deleteContentForward', null, { from: BEFORE_GAP - 1, to: BEFORE_GAP });
      input(editor, 'insertText', 'Q');

      expect(answerOf(editor, 'gap_a')).toBe('xy');
      expect(editor.getText()).toBe('aQxycd');
    });
  });

  describe('composition', () => {
    const PLACEHOLDER = String.fromCharCode(0x200b);

    const compose = (editor, type) =>
      editor.view.dom.dispatchEvent(new CompositionEvent(type, { bubbles: true }));

    const afterCompositionEnd = () => new Promise(resolve => setTimeout(resolve));

    async function renderInBlankGap() {
      const editor = await renderAt(1);
      editor.commands.insertGap();
      const [inserted] = gapIdentifiers(editor);
      return { editor, inserted };
    }

    it('gives a composition in a blank gap text to compose into, inside the gap', async () => {
      const { editor, inserted } = await renderInBlankGap();

      compose(editor, 'compositionstart');

      expect(answerOf(editor, inserted)).toBe(PLACEHOLDER);
      expect(isInGap(editor)).toBe(true);
      expect(caret(editor).pos).toBe(findGap(editor, inserted).pos + 2);
    });

    it('removes that text when the composition ends', async () => {
      const { editor, inserted } = await renderInBlankGap();

      compose(editor, 'compositionstart');
      compose(editor, 'compositionend');
      await afterCompositionEnd();

      expect(findGap(editor, inserted).node.content.size).toBe(0);
      expect(isInGap(editor)).toBe(true);
    });

    it('adds nothing to a composition inside an answer', async () => {
      const editor = await renderAt(5);

      compose(editor, 'compositionstart');

      expect(editor.getHTML()).toBe(PASSAGE);
    });
  });

  describe('Backspace and Delete', () => {
    it('Backspace removes a blank gap', async () => {
      const editor = await renderAt(1);
      editor.commands.insertGap();

      press(editor, 'Backspace');

      expect(gapIdentifiers(editor)).toEqual(['gap_a']);
    });

    it.each([
      ['Ctrl+Backspace', { ctrlKey: true }],
      ['Shift+Ctrl+Backspace', { ctrlKey: true, shiftKey: true }],
      ['Alt+Backspace, the word delete on macOS,', { altKey: true }],
    ])('%s removes a blank gap', async (_, modifiers) => {
      const editor = await renderAt(1);
      editor.commands.insertGap();

      press(editor, 'Backspace', modifiers);

      expect(gapIdentifiers(editor)).toEqual(['gap_a']);
    });

    it('Backspace after a gap moves into it, deleting nothing', async () => {
      const editor = await renderAt(AFTER_GAP);

      press(editor, 'Backspace');

      expect(editor.getHTML()).toBe(PASSAGE);
      expect(caret(editor).pos).toBe(ANSWER_END);
    });

    it('Delete before a gap moves into it, deleting nothing', async () => {
      const editor = await renderAt(BEFORE_GAP);

      press(editor, 'Delete');

      expect(editor.getHTML()).toBe(PASSAGE);
      expect(caret(editor).pos).toBe(ANSWER_START);
    });

    it('Backspace at the start of an answer deletes nothing', async () => {
      const editor = await renderAt(ANSWER_START);

      const unhandled = press(editor, 'Backspace');

      expect(unhandled).toBe(false);
      expect(editor.getHTML()).toBe(PASSAGE);
    });

    it('Delete at the end of an answer deletes nothing', async () => {
      const editor = await renderAt(ANSWER_END);

      const unhandled = press(editor, 'Delete');

      expect(unhandled).toBe(false);
      expect(editor.getHTML()).toBe(PASSAGE);
    });

    it('restores a deleted gap with its answer and identifiers on undo', async () => {
      const { editor } = await renderPassage({ value: PASSAGE });
      const { pos, node } = findGap(editor, 'gap_a');

      editor.commands.deleteRange({ from: pos, to: pos + node.nodeSize });
      editor.commands.undo();

      expect(editor.getHTML()).toBe(PASSAGE);
    });
  });

  describe('a line break or a block inside a gap', () => {
    it('leaves the gap whole on Shift+Enter', async () => {
      const editor = await renderAt(5);

      press(editor, 'Enter', { shiftKey: true });

      expect(editor.getHTML()).toBe(PASSAGE);
    });

    it('leaves no two gaps with one identifier when a block splits a gap', async () => {
      const editor = await renderAt(5);

      editor.commands.insertContent({ type: 'image', attrs: { src: 'x.png' } });

      const identifiers = gapIdentifiers(editor);
      expect(identifiers[0]).toBe('gap_a');
      expect(new Set(identifiers).size).toBe(identifiers.length);
    });
  });

  describe('paste', () => {
    it('gives a copy a fresh identifier and no answer identifier', async () => {
      const editor = await renderAt(1);

      paste(editor, gap('gap_a', 'xy', 'choice_a'));

      const [copy, original] = gapIdentifiers(editor);
      expect(original).toBe('gap_a');
      expect(copy).not.toBe('gap_a');
      expect(findGap(editor, copy).node.attrs.correct).toBeNull();
      expect(answerOf(editor, copy)).toBe('xy');
    });

    it('keeps the identifiers on cut and paste', async () => {
      const { editor } = await renderPassage({ value: PASSAGE });
      const { pos, node } = findGap(editor, 'gap_a');
      editor.commands.deleteRange({ from: pos, to: pos + node.nodeSize });
      editor.commands.setTextSelection(1);

      paste(editor, gap('gap_a', 'xy', 'choice_a'));

      expect(findGap(editor, 'gap_a').node.attrs.correct).toBe('choice_a');
    });

    it('pastes paragraphs into a gap as one line of its answer', async () => {
      const editor = await renderAt(5);

      paste(editor, '<p>one</p><p><strong>two</strong></p>');

      expect(gapIdentifiers(editor)).toEqual(['gap_a']);
      expect(findGap(editor, 'gap_a').node.content.toJSON()).toEqual([
        { type: 'text', text: 'xone ' },
        { type: 'text', text: 'two', marks: [{ type: 'bold' }] },
        { type: 'text', text: 'y' },
      ]);
      expect(editor.state.doc.childCount).toBe(1);
    });

    it('gives a copy inserted by a transaction a fresh identifier', async () => {
      const editor = await renderAt(1);

      editor.commands.insertContent(gap('gap_a', 'xy', 'choice_a'));

      const identifiers = gapIdentifiers(editor);
      expect(identifiers).toContain('gap_a');
      expect(new Set(identifiers).size).toBe(2);
    });
  });

  describe('arrow keys', () => {
    const positionsAfter = (editor, key, count) =>
      Array.from({ length: count }, () => {
        press(editor, key);
        return caret(editor).pos;
      });

    it('stop at both edges of a gap and of its answer', async () => {
      const editor = await renderAt(BEFORE_GAP);

      expect(positionsAfter(editor, 'ArrowRight', 4)).toEqual([4, 5, 6, AFTER_GAP]);
      expect(positionsAfter(editor, 'ArrowLeft', 4)).toEqual([6, 5, 4, BEFORE_GAP]);
    });

    it('follow the text direction in right-to-left text', async () => {
      const editor = await renderAt(BEFORE_GAP);
      const { getComputedStyle } = window;
      const spy = jest
        .spyOn(window, 'getComputedStyle')
        .mockImplementation((el, ...rest) =>
          editor.view.dom.contains(el)
            ? { direction: 'rtl' }
            : getComputedStyle.call(window, el, ...rest),
        );

      expect(positionsAfter(editor, 'ArrowLeft', 1)).toEqual([ANSWER_START]);
      expect(positionsAfter(editor, 'ArrowRight', 1)).toEqual([BEFORE_GAP]);
      spy.mockRestore();
    });

    it('follow the text around a gap whose answer runs the other way', async () => {
      const editor = await renderAt(BEFORE_GAP);
      const { getComputedStyle } = window;
      const spy = jest
        .spyOn(window, 'getComputedStyle')
        .mockImplementation((el, ...rest) =>
          editor.view.dom.contains(el)
            ? { direction: el.closest('.answer') ? 'ltr' : 'rtl' }
            : getComputedStyle.call(window, el, ...rest),
        );

      expect(positionsAfter(editor, 'ArrowLeft', 4)).toEqual([4, 5, 6, AFTER_GAP]);
      spy.mockRestore();
    });

    it('stop beside the gaps on both sides of a paragraph break', async () => {
      const editor = await renderPassage({
        value: `<p>a${gap('gap_a', 'x')}</p><p>${gap('gap_b', 'y')}b</p>`,
      }).then(rendered => rendered.editor);
      const afterA = findGap(editor, 'gap_a').pos + 3;
      const beforeB = findGap(editor, 'gap_b').pos;
      editor.commands.setTextSelection(afterA);

      expect(positionsAfter(editor, 'ArrowRight', 2)).toEqual([beforeB, beforeB + 1]);
      expect(positionsAfter(editor, 'ArrowLeft', 2)).toEqual([beforeB, afterA]);
    });

    it('do not skip a block image between the paragraphs', async () => {
      const { editor } = await renderPassage({
        value: `<p>a${gap('gap_a', 'x')}</p><img src="sun.png"><p>b</p>`,
      });
      const afterA = findGap(editor, 'gap_a').pos + 3;
      editor.commands.setTextSelection(afterA);

      press(editor, 'ArrowRight');

      expect(caret(editor).parent).not.toBe(editor.state.doc.lastChild);
    });
  });
});
