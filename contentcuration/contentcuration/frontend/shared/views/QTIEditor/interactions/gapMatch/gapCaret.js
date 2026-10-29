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
const POSITIONS_TO_SEARCH = 1000;

const isPast = (coords, line, direction) =>
  direction < 0 ? coords.bottom <= line.top : coords.top >= line.bottom;

// `posAtCoords` finds nothing outside the viewport, and `coordsAtPos` works anywhere.
function lineBeside(view, $pos, direction) {
  const { doc } = view.state;
  const caret = view.coordsAtPos($pos.pos);
  let line = null;
  let closest = null;
  for (let step = 1; step <= POSITIONS_TO_SEARCH; step++) {
    const pos = $pos.pos + step * direction;
    if (pos < 0 || pos > doc.content.size) break;
    if (!doc.resolve(pos).parent.inlineContent) continue;
    const coords = view.coordsAtPos(pos);
    if (!line) {
      if (!isPast(coords, caret, direction)) continue;
      line = coords;
    } else if (isPast(coords, line, direction)) {
      break;
    }
    const distance = Math.abs(coords.left - caret.left);
    if (!closest || distance < closest.distance) closest = { pos, distance };
  }
  return closest && closest.pos;
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

function isOverGap(view, gapPos, event) {
  const box = view.nodeDOM(gapPos).getBoundingClientRect();
  return event.clientX >= box.left && event.clientX <= box.right;
}

function edgeOfGap(view, $pos, event) {
  const atStart = $pos.pos === $pos.start();
  const atEnd = $pos.pos === $pos.end();
  if (!atStart && !atEnd) return null;
  const gap = view.nodeDOM($pos.before());
  const box = gap.getBoundingClientRect();
  const isRtl = window.getComputedStyle(gap.parentElement).direction === 'rtl';
  const pastLeft = event.clientX < box.left;
  const pastRight = event.clientX > box.right;
  if (atEnd && (isRtl ? pastLeft : pastRight)) return $pos.after();
  if (atStart && (isRtl ? pastRight : pastLeft)) return $pos.before();
  return $pos.pos;
}

function besideGap(view, $pos, event, isGap) {
  if (!isBesideGap($pos, isGap)) return null;
  const { nodeBefore, nodeAfter } = $pos;
  const overBefore = isGap(nodeBefore) && isOverGap(view, $pos.pos - nodeBefore.nodeSize, event);
  const overAfter = isGap(nodeAfter) && isOverGap(view, $pos.pos, event);
  return overBefore || overAfter ? null : $pos.pos;
}

// For a click at a gap's edge, browsers can put the caret on the other side of the edge from
// where ProseMirror resolves the click: inside a gap for a click past it at a line's edge, and
// at the end of the node before a gap for a click on its leading edge.
function clickAtGapEdge(view, pos, event, isGap) {
  const $pos = view.state.doc.resolve(pos);
  const caret = isGap($pos.parent)
    ? edgeOfGap(view, $pos, event)
    : besideGap(view, $pos, event, isGap);
  if (caret === null) return false;
  view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, caret)));
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
      handleClick: (view, pos, event) => clickAtGapEdge(view, pos, event, isGap),
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
