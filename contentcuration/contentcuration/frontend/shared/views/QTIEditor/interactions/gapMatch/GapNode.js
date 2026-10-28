// The resolver does not read package `exports` subpaths.
/* eslint-disable import/no-unresolved */
import { isHistoryTransaction } from '@tiptap/pm/history';
import { Fragment, Slice } from '@tiptap/pm/model';
import { Plugin, TextSelection } from '@tiptap/pm/state';
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
import { CORRECT_ATTR, GAP } from './parse';

const NODE_NAME = 'gap';

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

// A copy takes a fresh identifier and drops the answer identifier, which the save derives from
// the gap's.
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

// A gap's answer is one line of text and formulas, so what is pasted into a gap is flattened to
// that: a space takes the place of each line break and each break between blocks.
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

/** Whether a position is at the edge of a gap, inside or outside it. */
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

const DELETE_INPUTS = ['deleteContentBackward', 'deleteContentForward'];

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
      // The content, if any, becomes the gap's answer. The cursor goes to the end of it.
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
          tr.setSelection(TextSelection.create(tr.doc, end));
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
    // Backspace after a gap and Delete before one go into it, rather than delete it whole.
    const enterGap =
      forward =>
      ({ editor }) => {
        const $pos = caret(editor);
        if (!$pos || !isGap(forward ? $pos.nodeAfter : $pos.nodeBefore)) return false;
        return editor.commands.setTextSelection(forward ? $pos.pos + 1 : $pos.pos - 1);
      };
    // At the edge of a gap's answer, Backspace and Delete would join or delete across it.
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
        const outsideGap = isGap($pos.parent) ? $pos.before() : $pos.pos;
        const forward = (key === 'ArrowRight') !== isRtlAt(editor.view, outsideGap);
        const target = forward ? $pos.pos + 1 : $pos.pos - 1;
        const { doc } = editor.state;
        if (target < 0 || target > doc.content.size) return false;
        const $target = doc.resolve(target);
        if (!touchesGap($pos) && !touchesGap($target)) return false;
        if (!$target.parent.inlineContent) return false;
        return editor.commands.setTextSelection(target);
      };
    return {
      Backspace: props =>
        removeBlankGap(props) || enterGap(false)(props) || stayInGap(false)(props),
      Delete: props => removeBlankGap(props) || enterGap(true)(props) || stayInGap(true)(props),
      ArrowLeft: arrow('ArrowLeft'),
      ArrowRight: arrow('ArrowRight'),
    };
  },

  addNodeView() {
    return VueNodeViewRenderer(GapChip);
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handleDOMEvents: {
            // Chrome puts text typed at the edge of a gap, or into a blank one, outside the gap,
            // and removes a gap whose last character is deleted. So these edits go through
            // ProseMirror instead of the browser.
            beforeinput(view, event) {
              const { selection } = view.state;
              if (!selection.empty) return false;
              const { $from, from } = selection;
              const { tr } = view.state;
              if (event.inputType === 'insertText' && event.data && touchesGap($from)) {
                tr.insertText(event.data);
              } else if (
                DELETE_INPUTS.includes(event.inputType) &&
                isGap($from.parent) &&
                $from.parent.content.size === 1
              ) {
                const backward = event.inputType === 'deleteContentBackward';
                const [start, end] = backward ? [from - 1, from] : [from, from + 1];
                if (start < $from.start() || end > $from.end()) return false;
                tr.delete(start, end);
              } else {
                return false;
              }
              event.preventDefault();
              view.dispatch(tr.scrollIntoView());
              return true;
            },
          },
          // A copy must not share an identifier with the original; a cut-paste has already
          // removed it.
          transformPasted(slice, view) {
            if (isGap(view.state.selection.$from.parent)) {
              return new Slice(flattenForGap(slice.content, view.state.schema), 0, 0);
            }
            // Whether a drag moves or copies is only known at drop; see `appendTransaction`.
            if (view.dragging || gapsIn(slice.content).next().done) return slice;
            const taken = new Set(
              findChildren(view.state.doc, isGap).map(({ node }) => node.attrs.identifier),
            );
            return new Slice(reidentify(slice.content, taken), slice.openStart, slice.openEnd);
          },
        },
        // Catches inserts `transformPasted` does not see, such as a drop, the toolbar's Paste,
        // which inserts through `insertContent`, and a block inserted inside a gap, which splits
        // it. An inserted gap whose identifier another gap still has is a copy or a split half.
        appendTransaction(transactions, oldState, newState) {
          // Undo and redo only restore states this plugin already accepted.
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
