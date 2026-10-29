import { nextTick } from 'vue';
import { screen } from '@testing-library/vue';
import { qtiEditorStrings } from '../../../qtiEditorStrings';
import { findGap, gap, press, renderPassage } from './renderPassage';
import { stubProseMirrorLayout } from 'shared/utils/testing';

jest.mock('shared/utils/browserInfo', () => ({ isTouchDevice: false }));

// <p>ab[gap_a: xy]cd</p>: the gap starts at 3, its answer runs from 4 to 6, and 7 is after it.
const PASSAGE = `<p>ab${gap('gap_a', 'xy')}cd</p>`;

async function renderAt(pos, value = PASSAGE) {
  const { editor } = await renderPassage({ value });
  editor.view.dom.focus();
  editor.commands.setTextSelection(pos);
  return editor;
}

/** The browser's caret as the text it is in and its offset there, or the element it is in. */
function browserCaret() {
  const { anchorNode, anchorOffset } = document.getSelection();
  const where = anchorNode.nodeType === Node.TEXT_NODE ? anchorNode.data : anchorNode.nodeName;
  return [where, anchorOffset];
}

describe('gap caret', () => {
  stubProseMirrorLayout();

  describe('browser caret', () => {
    it('is at the end of the text before a gap when the caret leaves the gap backward', async () => {
      const editor = await renderAt(4);

      press(editor, 'ArrowLeft');

      expect(editor.state.selection.from).toBe(3);
      expect(browserCaret()).toEqual(['ab', 2]);
    });

    it('is at the start of the answer when the caret enters a gap', async () => {
      const editor = await renderAt(3);

      press(editor, 'ArrowRight');

      expect(editor.state.selection.from).toBe(4);
      expect(browserCaret()).toEqual(['xy', 0]);
    });

    it('is at the start of the text after a gap when the caret leaves the gap forward', async () => {
      const editor = await renderAt(6);

      press(editor, 'ArrowRight');

      expect(editor.state.selection.from).toBe(7);
      expect(browserCaret()).toEqual(['cd', 0]);
    });

    it('is between the gaps, not in an answer, when nothing but gaps is beside it', async () => {
      const editor = await renderAt(3, `<p>${gap('gap_a', 'x')}${gap('gap_b', 'y')}</p>`);

      press(editor, 'ArrowRight');

      expect(editor.state.selection.from).toBe(4);
      expect(browserCaret()).toEqual(['P', 1]);
    });
  });

  describe('drawn caret', () => {
    const drawnCarets = editor => [...editor.view.dom.querySelectorAll('.gap-caret')];

    it('is drawn between two gaps, where the browser has no text to draw its caret in', async () => {
      const editor = await renderAt(3, `<p>${gap('gap_a', 'x')}${gap('gap_b', 'y')}</p>`);

      press(editor, 'ArrowRight');

      const [caret] = drawnCarets(editor);
      expect(caret.previousElementSibling).toHaveTextContent('x');
      expect(caret.nextElementSibling).toHaveTextContent('y');
      expect(caret).toHaveAttribute('aria-hidden', 'true');
      expect(editor.view.dom).toHaveClass('hides-caret');
    });

    it('is not drawn where text is beside the caret', async () => {
      const editor = await renderAt(4);

      press(editor, 'ArrowLeft');

      expect(drawnCarets(editor)).toEqual([]);
      expect(editor.view.dom).not.toHaveClass('hides-caret');
    });
  });

  describe('up and down arrows beside the drawn caret', () => {
    const GAPS = `<p>${gap('gap_a', 'x')}${gap('gap_b', 'y')}</p>`;
    const LINE_HEIGHT = 20;

    // `posAtCoords` finds nothing outside the viewport.
    function layOut(editor, secondLineStart) {
      jest.spyOn(editor.view, 'coordsAtPos').mockImplementation(pos => {
        const line = pos < secondLineStart ? 0 : 1;
        const left = (line ? pos - secondLineStart + 1 : pos) * 10;
        const top = line * LINE_HEIGHT;
        return { left, right: left, top, bottom: top + LINE_HEIGHT };
      });
      jest.spyOn(editor.view, 'posAtCoords').mockReturnValue(null);
    }

    it('moves the caret to the closest position on the line above', async () => {
      const editor = await renderAt(1, `<p>first line</p>${GAPS}`);
      layOut(editor, findGap(editor, 'gap_a').pos);
      editor.commands.setTextSelection(findGap(editor, 'gap_b').pos);

      const unhandled = press(editor, 'ArrowUp');

      expect(unhandled).toBe(false);
      expect(editor.state.selection.from).toBe(4);
    });

    it('moves the caret to the closest position on the line below', async () => {
      const editor = await renderAt(1, `${GAPS}<p>second line</p>`);
      const secondLineStart = editor.state.doc.firstChild.nodeSize + 1;
      layOut(editor, secondLineStart);
      editor.commands.setTextSelection(findGap(editor, 'gap_b').pos);

      press(editor, 'ArrowDown');

      expect(editor.state.selection.from).toBe(secondLineStart + 3);
    });

    it('keeps the caret where it is when no line is above', async () => {
      const editor = await renderAt(1, GAPS);
      layOut(editor, Infinity);

      const unhandled = press(editor, 'ArrowUp');

      expect(unhandled).toBe(false);
      expect(editor.state.selection.from).toBe(1);
    });

    it('leaves the move to the browser where it draws its own caret', async () => {
      const editor = await renderAt(7);

      const unhandled = press(editor, 'ArrowUp');

      expect(unhandled).toBe(true);
    });
  });

  describe('a click at a line edge beside a gap', () => {
    const GAP_BOX = { left: 100, right: 200, top: 0, bottom: 20 };

    /** Clicks at `x` where the browser resolves the click to `pos`. */
    function click(editor, x, pos, boxes = [GAP_BOX]) {
      jest.spyOn(editor.view, 'posAtCoords').mockReturnValue({ pos, inside: -1 });
      editor.view.dom.querySelectorAll('.gap').forEach((chip, i) => {
        chip.getBoundingClientRect = () => boxes[i];
      });
      const init = { bubbles: true, cancelable: true, button: 0, clientX: x, clientY: 10 };
      editor.view.dom.dispatchEvent(new MouseEvent('mousedown', init));
      return editor.view.dom.dispatchEvent(new MouseEvent('mouseup', init));
    }

    function inRtl(editor) {
      const { getComputedStyle } = window;
      jest
        .spyOn(window, 'getComputedStyle')
        .mockImplementation((el, ...rest) =>
          editor.view.dom.contains(el)
            ? { direction: 'rtl' }
            : getComputedStyle.call(window, el, ...rest),
        );
    }

    afterEach(() => jest.restoreAllMocks());

    // <p>ab[gap_a: xy]</p>: the answer ends at 6, and 7 is after the gap, at the line's end.
    it('puts the caret after a gap at the line end for a click past it', async () => {
      const editor = await renderAt(1, `<p>ab${gap('gap_a', 'xy')}</p>`);

      click(editor, 260, 6);

      expect(editor.state.selection.from).toBe(7);
    });

    // <p>[gap_a: xy]cd</p>: 1 is before the gap, at the line's start, and its answer starts at 2.
    it('puts the caret before a gap at the line start for a click before it', async () => {
      const editor = await renderAt(5, `<p>${gap('gap_a', 'xy')}cd</p>`);

      click(editor, 40, 2);

      expect(editor.state.selection.from).toBe(1);
    });

    it('puts the caret after a gap for a click past its left side in right-to-left text', async () => {
      const editor = await renderAt(1, `<p>ab${gap('gap_a', 'xy')}</p>`);
      inRtl(editor);

      click(editor, 40, 6);

      expect(editor.state.selection.from).toBe(7);
    });

    it('puts the caret after a gap at the line end when the click resolves there', async () => {
      const editor = await renderAt(1, `<p>ab${gap('gap_a', 'xy')}</p>`);

      click(editor, 260, 7);

      expect(editor.state.selection.from).toBe(7);
    });

    it('puts the caret at the edge of the clicked gap for a click on it', async () => {
      const editor = await renderAt(1, `<p>ab${gap('gap_a', 'xy')}</p>`);
      const answerEnd = findGap(editor, 'gap_a').pos + 1 + 'xy'.length;

      const unhandled = click(editor, 190, answerEnd);

      expect(unhandled).toBe(false);
      expect(editor.state.selection.from).toBe(answerEnd);
    });

    it('puts the caret in the clicked gap for a click on its leading edge after another gap', async () => {
      const editor = await renderAt(1, `<p>${gap('gap_a', 'one')}${gap('gap_b', 'two')}</p>`);
      const answerStart = findGap(editor, 'gap_b').pos + 1;
      const boxes = [{ ...GAP_BOX, left: 0, right: 99 }, GAP_BOX];

      click(editor, 105, answerStart, boxes);

      expect(editor.state.selection.from).toBe(answerStart);
    });

    it('puts the caret in a gap for a click on its padding', async () => {
      const editor = await renderAt(1, `<p>${gap('gap_a', 'one')}${gap('gap_b', 'two')}</p>`);
      const answerStart = findGap(editor, 'gap_b').pos + 1;
      jest.spyOn(editor.view, 'posAtCoords').mockReturnValue({ pos: answerStart, inside: -1 });
      const [first, second] = editor.view.dom.querySelectorAll('.gap');
      first.getBoundingClientRect = () => ({ ...GAP_BOX, left: 0, right: 99 });
      second.getBoundingClientRect = () => GAP_BOX;
      // jsdom does not implement `isContentEditable`.
      Object.defineProperty(second, 'isContentEditable', { value: true });
      const init = { bubbles: true, cancelable: true, button: 0, clientX: 102, clientY: 10 };

      second.dispatchEvent(new MouseEvent('mousedown', init));
      second.dispatchEvent(new MouseEvent('mouseup', init));

      expect(editor.state.selection.from).toBe(answerStart);
    });

    it('leaves a click on the gap itself, resolved beside it, to the browser', async () => {
      const editor = await renderAt(1, `<p>ab${gap('gap_a', 'xy')}</p>`);

      const unhandled = click(editor, 190, findGap(editor, 'gap_a').pos);

      expect(unhandled).toBe(true);
    });
  });

  describe('outline', () => {
    const TWO_GAPS = `<p>ab${gap('gap_a', 'xy')}cd${gap('gap_b', 'z')}</p>`;
    const { gapWithAnswer$ } = qtiEditorStrings;
    const chip = (answer, number) =>
      screen.getByRole('group', { name: gapWithAnswer$({ answer, number }) });

    it('marks only the gap that holds the caret', async () => {
      await renderAt(5, TWO_GAPS);
      await nextTick();

      expect(chip('xy', 1)).toHaveClass('has-caret');
      expect(chip('z', 2)).not.toHaveClass('has-caret');
    });

    it('marks no gap while the caret is outside every gap', async () => {
      const editor = await renderAt(5, TWO_GAPS);
      await nextTick();

      editor.commands.setTextSelection(2);
      await nextTick();

      expect(chip('xy', 1)).not.toHaveClass('has-caret');
    });
  });
});
