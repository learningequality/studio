// The resolver does not read package `exports` subpaths.
/* eslint-disable import/no-unresolved */
import { Plugin, TextSelection } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
/* eslint-enable import/no-unresolved */

const caretOf = ({ selection }) => (selection.empty ? selection.$from : null);

const isBesideGap = ($pos, isGap) =>
  !isGap($pos.parent) && (isGap($pos.nodeBefore) || isGap($pos.nodeAfter));

const hasTextBeside = $pos => Boolean($pos.nodeBefore?.isText || $pos.nodeAfter?.isText);

// The browser has no text there to draw its own caret in.
const needsDrawnCaret = ($pos, isGap) => isBesideGap($pos, isGap) && !hasTextBeside($pos);

function drawnCaret() {
  const caret = document.createElement('span');
  caret.className = 'gap-caret';
  caret.contentEditable = 'false';
  caret.setAttribute('aria-hidden', 'true');
  return caret;
}

// Tiptap puts a node decoration's class on the node view's `NodeViewWrapper`.
function caretDecorations(state, isGap) {
  const $pos = caretOf(state);
  if (!$pos) return null;
  if (isGap($pos.parent)) {
    const mark = Decoration.node($pos.before(), $pos.after(), { class: 'has-caret' });
    return DecorationSet.create(state.doc, [mark]);
  }
  if (!needsDrawnCaret($pos, isGap)) return null;
  const caret = Decoration.widget($pos.pos, drawnCaret, {
    key: 'gap-caret',
    ignoreSelection: true,
  });
  return DecorationSet.create(state.doc, [caret]);
}

function browserCaretPoint(view, isGap) {
  const $pos = caretOf(view.state);
  if (!$pos) return null;
  if (isGap($pos.parent)) {
    if ($pos.pos === $pos.start()) return view.domAtPos($pos.pos, 1);
    if ($pos.pos === $pos.end()) return view.domAtPos($pos.pos, -1);
    return null;
  }
  if (!isBesideGap($pos, isGap)) return null;
  if ($pos.nodeBefore?.isText) return view.domAtPos($pos.pos, -1);
  if ($pos.nodeAfter?.isText) return view.domAtPos($pos.pos, 1);
  return view.domAtPos($pos.pos, 0);
}

// ProseMirror leaves the browser's selection alone when its DOM point reads back as the new
// position, and at a gap's edge one DOM point reads back as either side of the edge. Typing and
// composition go where the browser's selection is.
function placeBrowserCaret(view, isGap) {
  if (view.composing || !view.hasFocus()) return;
  const point = browserCaretPoint(view, isGap);
  if (!point) return;
  const selection = view.dom.ownerDocument.getSelection();
  const isThere =
    selection.isCollapsed &&
    selection.anchorNode === point.node &&
    selection.anchorOffset === point.offset;
  if (!isThere) selection.collapse(point.node, point.offset);
}

const LINE_DIRECTIONS = { ArrowUp: -1, ArrowDown: 1 };
const LINES_TO_SEARCH = 4;

function lineBeside(view, $pos, direction) {
  const { left, top, bottom } = view.coordsAtPos($pos.pos);
  const halfLine = (bottom - top) / 2;
  for (let step = 1; step <= 2 * LINES_TO_SEARCH; step++) {
    const y = direction < 0 ? top - step * halfLine : bottom + step * halfLine;
    const found = view.posAtCoords({ left, top: y });
    if (!found || !view.state.doc.resolve(found.pos).parent.inlineContent) continue;
    const coords = view.coordsAtPos(found.pos);
    if (direction < 0 ? coords.bottom <= top : coords.top >= bottom) return found.pos;
  }
  return null;
}

// Chrome moves the browser's selection out of the editor on ArrowUp beside the drawn caret.
function moveToLine(view, event, isGap) {
  const direction = LINE_DIRECTIONS[event.key];
  if (!direction || event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return false;
  const $pos = caretOf(view.state);
  if (!$pos || !needsDrawnCaret($pos, isGap)) return false;
  const pos = lineBeside(view, $pos, direction);
  if (pos !== null) {
    const selection = TextSelection.create(view.state.doc, pos);
    view.dispatch(view.state.tr.setSelection(selection).scrollIntoView());
  }
  return true;
}

/**
 * Keeps the caret at a gap's edges where the editor's selection says it is.
 *
 * @param {(node: ?import('@tiptap/pm/model').Node) => boolean} isGap
 * @returns {Plugin}
 */
export function gapCaret(isGap) {
  return new Plugin({
    props: {
      decorations: state => caretDecorations(state, isGap),
      handleKeyDown: (view, event) => moveToLine(view, event, isGap),
      attributes: state => {
        const $pos = caretOf(state);
        return $pos && needsDrawnCaret($pos, isGap) ? { class: 'hides-caret' } : {};
      },
    },
    view(view) {
      placeBrowserCaret(view, isGap);
      return { update: updated => placeBrowserCaret(updated, isGap) };
    },
  });
}
