// The resolver does not read package `exports` subpaths.
/* eslint-disable import/no-unresolved */
import { isHistoryTransaction } from '@tiptap/pm/history';
import { Fragment, Slice } from '@tiptap/pm/model';
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';
/* eslint-enable import/no-unresolved */
import {
  Node,
  combineTransactionSteps,
  findChildren,
  findChildrenInRange,
  getChangedRanges,
  mergeAttributes,
} from '@tiptap/core';
import { VueNodeViewRenderer } from '@tiptap/vue-2';
import { generateRandomSlug } from '../../utils/generateRandomSlug';
import GapChip from './components/GapChip';
import { gapCaret } from './gapCaret';
import { CORRECT_ATTR, GAP } from './parse';

const NODE_NAME = 'gap';

export const GAP_INSERTED = 'gapInserted';

export const isGap = node => Boolean(node) && node.type.name === NODE_NAME;

export const findGap = (doc, identifier) =>
  findChildren(doc, node => isGap(node) && node.attrs.identifier === identifier)[0];

function* gapsIn(fragment) {
  for (let i = 0; i < fragment.childCount; i++) {
    const child = fragment.child(i);
    if (isGap(child)) yield child;
    else yield* gapsIn(child.content);
  }
}

function withFreshIdentifier(attrs, taken) {
  if (attrs.identifier && !taken.has(attrs.identifier)) return attrs;
  return { ...attrs, identifier: generateRandomSlug('gap'), correct: null };
}

function reidentify(fragment, taken) {
  const children = [];
  fragment.forEach(child => {
    if (isGap(child)) {
      const attrs = withFreshIdentifier(child.attrs, taken);
      taken.add(attrs.identifier);
      children.push(attrs === child.attrs ? child : child.type.create(attrs, child.content));
    } else {
      children.push(child.copy(reidentify(child.content, taken)));
    }
  });
  return Fragment.fromArray(children);
}

function flattenForGap(fragment, schema) {
  const nodes = [];
  let breaks = false;
  fragment.descendants(node => {
    if (node.isText || node.type.name === 'math') {
      if (breaks && nodes.length) nodes.push(schema.text(' '));
      breaks = false;
      nodes.push(node);
      return false;
    }
    if (node.isBlock || node.type.name === 'hardBreak') breaks = true;
    return true;
  });
  return Fragment.fromArray(nodes);
}

function touchesGap($pos) {
  return (
    isGap($pos.nodeBefore) ||
    isGap($pos.nodeAfter) ||
    (isGap($pos.parent) && ($pos.pos === $pos.start() || $pos.pos === $pos.end()))
  );
}

function isRtlAt(view, pos) {
  const { node } = view.domAtPos(pos);
  const element = node.nodeType === 1 ? node : node.parentElement;
  return window.getComputedStyle(element).direction === 'rtl';
}

const isReversed = (view, gapPos) => isRtlAt(view, gapPos) !== isRtlAt(view, gapPos + 1);

function stepIntoGap(view, $pos, forward) {
  const gapPos = forward ? $pos.pos : $pos.pos - $pos.nodeBefore.nodeSize;
  const start = gapPos + 1;
  const end = gapPos + view.state.doc.nodeAt(gapPos).nodeSize - 1;
  return forward !== isReversed(view, gapPos) ? start : end;
}

function stepOutsideGaps(view, $pos, key) {
  const forward = (key === 'ArrowRight') !== isRtlAt(view, $pos.pos);
  if (isGap(forward ? $pos.nodeAfter : $pos.nodeBefore)) return stepIntoGap(view, $pos, forward);
  const { doc } = view.state;
  const target = forward ? $pos.pos + 1 : $pos.pos - 1;
  if (target < 0 || target > doc.content.size) return null;
  let $target = doc.resolve(target);
  if (!$target.parent.inlineContent) {
    const next = TextSelection.findFrom($target, forward ? 1 : -1, true);
    if (!next || next.from !== target + (forward ? 1 : -1)) return null;
    $target = next.$head;
  }
  return touchesGap($pos) || touchesGap($target) ? $target.pos : null;
}

// In an answer that runs the other way from the passage, Chrome moves the caret by the
// passage's direction and Firefox by the answer's.
function stepInGap(view, $pos, key) {
  const gapPos = $pos.before();
  const reversed = isReversed(view, gapPos);
  const forward = (key === 'ArrowRight') !== isRtlAt(view, gapPos + 1);
  if (forward && $pos.pos === $pos.end()) return reversed ? $pos.before() : $pos.after();
  if (!forward && $pos.pos === $pos.start()) return reversed ? $pos.after() : $pos.before();
  const target = forward ? $pos.pos + 1 : $pos.pos - 1;
  const atEdge = pos => pos === $pos.start() || pos === $pos.end();
  return reversed || atEdge($pos.pos) || atEdge(target) ? target : null;
}

function endsBesideGap(doc, { from, to }) {
  return isGap(doc.resolve(from).nodeBefore) || isGap(doc.resolve(to).nodeAfter);
}

function targetRange(view, event) {
  const [range] = event.getTargetRanges();
  if (!range) return null;
  return {
    from: view.posAtDOM(range.startContainer, range.startOffset),
    to: view.posAtDOM(range.endContainer, range.endOffset),
  };
}

const PLACEHOLDER = String.fromCharCode(0x200b);
const compositionKey = new PluginKey('gapComposition');

function removePlaceholder(view) {
  const pos = compositionKey.getState(view.state);
  if (view.isDestroyed || pos === null || view.composing) return;
  const tr = view.state.tr.setMeta(compositionKey, null).setMeta('addToHistory', false);
  if (view.state.doc.textBetween(pos, pos + 1) === PLACEHOLDER) tr.delete(pos, pos + 1);
  view.dispatch(tr);
}

// Composition cannot be cancelled, and Chrome composes at the edge of a gap on the wrong side
// of it, or, in a blank gap, outside the node view's content, where ProseMirror never reads it.
// A placeholder at the caret gives Chrome a text node on the correct side to compose into.
const compositionPlaceholder = new Plugin({
  key: compositionKey,
  state: {
    init: () => null,
    apply(tr, pos) {
      const meta = tr.getMeta(compositionKey);
      if (meta !== undefined) return meta;
      return pos === null ? null : tr.mapping.map(pos, -1);
    },
  },
  props: {
    handleDOMEvents: {
      compositionstart(view) {
        const { selection } = view.state;
        if (!selection.empty || !touchesGap(selection.$from)) return false;
        const tr = view.state.tr.insertText(PLACEHOLDER);
        view.dispatch(tr.setMeta(compositionKey, selection.from).setMeta('addToHistory', false));
        return false;
      },
      // ProseMirror ends its composition after this handler runs.
      compositionend(view) {
        setTimeout(() => removePlaceholder(view));
        return false;
      },
    },
  },
});

export const GapNode = Node.create({
  name: NODE_NAME,
  group: 'inline',
  inline: true,
  content: '(text | math)*',
  // Without it, inserting a line break or a block inside a gap splits the gap in two.
  isolating: true,

  addAttributes() {
    return {
      identifier: {
        default: null,
        parseHTML: el => el.getAttribute('identifier'),
        renderHTML: ({ identifier }) => ({ identifier }),
      },
      correct: {
        default: null,
        parseHTML: el => el.getAttribute(CORRECT_ATTR),
        renderHTML: ({ correct }) => (correct ? { [CORRECT_ATTR]: correct } : {}),
      },
    };
  },

  parseHTML() {
    return [{ tag: GAP }];
  },

  renderHTML({ HTMLAttributes }) {
    return [GAP, mergeAttributes(HTMLAttributes), 0];
  },

  addCommands() {
    return {
      insertGap:
        content =>
        ({ tr, commands }) => {
          const identifier = generateRandomSlug('gap');
          const inserted = commands.insertContent({
            type: NODE_NAME,
            attrs: { identifier },
            ...(content?.length ? { content } : {}),
          });
          const found = inserted && findGap(tr.doc, identifier);
          if (!found) return false;
          const end = found.pos + 1 + found.node.content.size;
          tr.setSelection(TextSelection.create(tr.doc, end)).setMeta(GAP_INSERTED, true);
          return true;
        },
    };
  },

  addKeyboardShortcuts() {
    const caret = editor => {
      const { selection } = editor.state;
      return selection.empty ? selection.$from : null;
    };
    const removeBlankGap = ({ editor }) => {
      const $pos = caret(editor);
      if (!$pos || !isGap($pos.parent) || $pos.parent.content.size) return false;
      return editor.commands.deleteRange({ from: $pos.before(), to: $pos.after() });
    };
    const enterGap =
      forward =>
      ({ editor }) => {
        const $pos = caret(editor);
        if (!$pos || !isGap(forward ? $pos.nodeAfter : $pos.nodeBefore)) return false;
        return editor.commands.setTextSelection(forward ? $pos.pos + 1 : $pos.pos - 1);
      };
    const stayInGap =
      forward =>
      ({ editor }) => {
        const $pos = caret(editor);
        if (!$pos || !isGap($pos.parent)) return false;
        return $pos.pos === (forward ? $pos.end() : $pos.start());
      };
    // Browsers skip the caret positions at the edges of an inline-block, so near a gap the
    // arrows move one position at a time.
    const arrow =
      key =>
      ({ editor }) => {
        const $pos = caret(editor);
        if (!$pos) return false;
        const target = isGap($pos.parent)
          ? stepInGap(editor.view, $pos, key)
          : stepOutsideGaps(editor.view, $pos, key);
        return target !== null && editor.commands.setTextSelection(target);
      };
    return {
      Backspace: props =>
        removeBlankGap(props) || enterGap(false)(props) || stayInGap(false)(props),
      Delete: props => removeBlankGap(props) || enterGap(true)(props) || stayInGap(true)(props),
      'Mod-Backspace': removeBlankGap,
      'Shift-Mod-Backspace': removeBlankGap,
      'Alt-Backspace': removeBlankGap,
      ArrowLeft: arrow('ArrowLeft'),
      ArrowRight: arrow('ArrowRight'),
    };
  },

  addNodeView() {
    // Tiptap's node views stop ProseMirror from handling a mousedown outside their content, such
    // as on a gap's padding, and the browser then puts the caret outside the gap.
    return VueNodeViewRenderer(GapChip, { stopEvent: () => false });
  },

  addProseMirrorPlugins() {
    return [
      compositionPlaceholder,
      gapCaret(isGap),
      new Plugin({
        props: {
          handleDOMEvents: {
            // Chrome puts text typed at the edge of a gap, or into a blank one, outside the gap,
            // removes a gap when a delete empties its answer, and leaves the caret inside a gap
            // after a delete beside it. So these edits go through ProseMirror instead.
            beforeinput(view, event) {
              const { selection, tr } = view.state;
              const { $from, $to } = selection;
              const isDelete = event.inputType.startsWith('delete');
              if (isDelete && isGap($from.parent) && $from.sameParent($to)) {
                const range = selection.empty ? targetRange(view, event) : selection;
                if (!range || range.from > $from.start() || range.to < $from.end()) return false;
                tr.delete($from.start(), $from.end());
              } else if (isDelete && selection.empty) {
                const range = targetRange(view, event);
                if (!range || !endsBesideGap(tr.doc, range)) return false;
                tr.delete(range.from, range.to);
              } else if (
                selection.empty &&
                event.inputType === 'insertText' &&
                event.data &&
                touchesGap($from)
              ) {
                tr.insertText(event.data);
              } else {
                return false;
              }
              event.preventDefault();
              view.dispatch(tr.scrollIntoView());
              return true;
            },
          },
          transformPasted(slice, view) {
            if (isGap(view.state.selection.$from.parent)) {
              return new Slice(flattenForGap(slice.content, view.state.schema), 0, 0);
            }
            if (view.dragging || gapsIn(slice.content).next().done) return slice;
            const taken = new Set(
              findChildren(view.state.doc, isGap).map(({ node }) => node.attrs.identifier),
            );
            return new Slice(reidentify(slice.content, taken), slice.openStart, slice.openEnd);
          },
        },
        // On a drop, `transformPasted` cannot tell a move from a copy. It does not see the
        // toolbar's Paste, which inserts through `insertContent`, or a block inserted inside a
        // gap, which splits it.
        appendTransaction(transactions, oldState, newState) {
          if (transactions.every(isHistoryTransaction)) return null;
          if (!transactions.some(tr => tr.docChanged)) return null;
          const changed = getChangedRanges(combineTransactionSteps(oldState.doc, transactions));
          const inserted = new Map();
          for (const { newRange } of changed) {
            for (const { node, pos } of findChildrenInRange(newState.doc, newRange, isGap)) {
              inserted.set(pos, node);
            }
          }
          if (!inserted.size) return null;
          const taken = new Set();
          for (const { node, pos } of findChildren(newState.doc, isGap)) {
            if (!inserted.has(pos)) taken.add(node.attrs.identifier);
          }
          let tr = null;
          for (const [pos, node] of [...inserted].sort(([a], [b]) => a - b)) {
            const attrs = withFreshIdentifier(node.attrs, taken);
            if (attrs !== node.attrs) {
              tr = (tr || newState.tr).setNodeMarkup(pos, undefined, attrs);
            }
            taken.add(attrs.identifier);
          }
          return tr;
        },
      }),
    ];
  },
});
