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
});
