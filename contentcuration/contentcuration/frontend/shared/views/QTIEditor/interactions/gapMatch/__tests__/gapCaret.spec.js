import { nextTick } from 'vue';
import { screen } from '@testing-library/vue';
import { qtiEditorStrings } from '../../../qtiEditorStrings';
import { gap, press, renderPassage } from './renderPassage';
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
