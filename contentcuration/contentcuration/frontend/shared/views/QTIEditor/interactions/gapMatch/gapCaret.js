// The resolver does not read package `exports` subpaths.
// eslint-disable-next-line import/no-unresolved
import { Plugin } from '@tiptap/pm/state';

function browserCaretPoint(view, isGap) {
  const { selection } = view.state;
  if (!selection.empty) return null;
  const $pos = selection.$from;
  if (isGap($pos.parent)) {
    if ($pos.pos === $pos.start()) return view.domAtPos($pos.pos, 1);
    if ($pos.pos === $pos.end()) return view.domAtPos($pos.pos, -1);
    return null;
  }
  if (!isGap($pos.nodeBefore) && !isGap($pos.nodeAfter)) return null;
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

/**
 * Keeps the caret at a gap's edges where the editor's selection says it is.
 *
 * @param {(node: ?import('@tiptap/pm/model').Node) => boolean} isGap
 * @returns {Plugin}
 */
export function gapCaret(isGap) {
  return new Plugin({
    view(view) {
      placeBrowserCaret(view, isGap);
      return { update: updated => placeBrowserCaret(updated, isGap) };
    },
  });
}
