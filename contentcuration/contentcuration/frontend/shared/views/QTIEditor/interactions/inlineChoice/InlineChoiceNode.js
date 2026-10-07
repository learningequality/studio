// The resolver does not read package `exports` subpaths.
/* eslint-disable import/no-unresolved */
import { isHistoryTransaction } from '@tiptap/pm/history';
import { Fragment, Slice } from '@tiptap/pm/model';
import { NodeSelection, Plugin } from '@tiptap/pm/state';
/* eslint-enable import/no-unresolved */
import {
  Node,
  combineTransactionSteps,
  findChildren,
  findChildrenInRange,
  getChangedRanges,
} from '@tiptap/core';
import { VueNodeViewRenderer } from '@tiptap/vue-2';
import { generateRandomSlug } from '../../utils/generateRandomSlug';
import InlineChoiceChip from './components/InlineChoiceChip';
import { CORRECT_ATTR, DROPDOWN, OPTION, readDropdown } from './parse';

const NODE_NAME = 'inlineChoice';

const isChip = node => node.type.name === NODE_NAME;

export const findChip = (doc, responseIdentifier) =>
  findChildren(
    doc,
    node => isChip(node) && node.attrs.responseIdentifier === responseIdentifier,
  )[0];

function* chipsIn(fragment) {
  for (let i = 0; i < fragment.childCount; i++) {
    const child = fragment.child(i);
    if (isChip(child)) yield child;
    else yield* chipsIn(child.content);
  }
}

function idsOf(attrs) {
  return [attrs.responseIdentifier, ...attrs.options.map(option => option.id)];
}

const claimIds = (taken, attrs) => idsOf(attrs).forEach(id => taken.add(id));

// A missing id needs a fresh one too: the save leaves it missing.
function needsFreshIds(attrs, taken) {
  const ids = idsOf(attrs);
  return new Set(ids).size !== ids.length || ids.some(id => !id || taken.has(id));
}

// Renames only the missing and taken ids, so a cut-paste keeps the chip's identity.
function withFreshIds({ responseIdentifier, options, correctId }, taken) {
  const seen = new Set(taken);
  const fresh = (id, prefix) => {
    if (!id || seen.has(id)) return generateRandomSlug(prefix);
    seen.add(id);
    return id;
  };
  const renamed = { responseIdentifier: fresh(responseIdentifier, 'response') };
  renamed.options = options.map(option => ({ ...option, id: fresh(option.id, 'choice') }));
  const correctIndex = options.findIndex(option => option.id === correctId);
  renamed.correctId = correctIndex === -1 ? null : renamed.options[correctIndex].id;
  return renamed;
}

const isSpace = (doc, pos) => /\s/.test(doc.textBetween(pos, pos + 1));

function trimmedRange({ doc, selection }) {
  let { from, to } = selection;
  while (from < to && isSpace(doc, from)) from++;
  while (to > from && isSpace(doc, to - 1)) to--;
  return { from, to };
}

function reidentify(fragment, taken) {
  const children = [];
  fragment.forEach(child => {
    if (isChip(child)) {
      const node = needsFreshIds(child.attrs, taken)
        ? child.type.create(withFreshIds(child.attrs, taken))
        : child;
      claimIds(taken, node.attrs);
      children.push(node);
    } else {
      children.push(child.copy(reidentify(child.content, taken)));
    }
  });
  return Fragment.fromArray(children);
}

export const InlineChoiceNode = Node.create({
  name: NODE_NAME,
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      responseIdentifier: { default: '', rendered: false },
      options: { default: [], rendered: false },
      correctId: { default: null, rendered: false },
    };
  },

  parseHTML() {
    return [{ tag: DROPDOWN, getAttrs: readDropdown }];
  },

  renderHTML({ node }) {
    const { responseIdentifier, options, correctId } = node.attrs;
    const attrs = { 'response-identifier': responseIdentifier };
    if (correctId !== null) attrs[CORRECT_ATTR] = correctId;
    return [
      DROPDOWN,
      attrs,
      ...options.map(option => [OPTION, { identifier: option.id }, option.text]),
    ];
  },

  addCommands() {
    return {
      // The selected text becomes the chip's correct option. With no text, or with an inline
      // atom (a chip, a formula) that plain text cannot hold, the chip goes after the selection,
      // so nothing is deleted.
      insertInlineChoice:
        responseIdentifier =>
        ({ tr, commands }) => {
          const { from, to } = trimmedRange(tr);
          const { selection } = tr;
          let hasAtom = false;
          tr.doc.nodesBetween(selection.from, selection.to, node => {
            if (node.isInline && !node.isText) hasAtom = true;
            return !hasAtom;
          });
          const text = hasAtom ? '' : tr.doc.textBetween(from, to);
          const option = { id: generateRandomSlug('choice'), text };
          const attrs = {
            responseIdentifier,
            options: [option],
            correctId: text ? option.id : null,
          };
          // Places the cursor after the chip, even when it has to be wrapped in a new paragraph.
          return commands.insertContentAt(text ? { from, to } : selection.to, {
            type: NODE_NAME,
            attrs,
          });
        },
      // A chip needs at least one option, each with an id, to be schema-valid.
      updateInlineChoice:
        (responseIdentifier, { options, correctId }) =>
        ({ tr, state, dispatch }) => {
          const found = findChip(state.doc, responseIdentifier);
          if (!found || (options && !options.length)) return false;
          const attrs = { ...found.node.attrs };
          if (options) {
            attrs.options = options.map(option =>
              option.id ? option : { ...option, id: generateRandomSlug('choice') },
            );
          }
          if (correctId !== undefined) attrs.correctId = correctId;
          if (!attrs.options.some(option => option.id === attrs.correctId)) attrs.correctId = null;
          if (dispatch) {
            const wasSelected = tr.selection.node && tr.selection.from === found.pos;
            // Replaces the chip, so history groups quick successive edits as it does typing.
            tr.setNodeMarkup(found.pos, undefined, attrs);
            if (wasSelected) tr.setSelection(NodeSelection.create(tr.doc, found.pos));
          }
          return true;
        },
    };
  },

  addNodeView() {
    return VueNodeViewRenderer(InlineChoiceChip);
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          // A copy must not share ids with the original; a cut-paste has already removed them.
          transformPasted(slice, view) {
            // Whether a drag moves or copies is only known at drop; see `appendTransaction`.
            if (view.dragging || chipsIn(slice.content).next().done) return slice;
            const taken = new Set();
            for (const { node } of findChildren(view.state.doc, isChip))
              claimIds(taken, node.attrs);
            return new Slice(reidentify(slice.content, taken), slice.openStart, slice.openEnd);
          },
        },
        // Catches inserts `transformPasted` does not see, such as a drop. An inserted chip whose
        // ids are still in use elsewhere was copied, not moved.
        appendTransaction(transactions, oldState, newState) {
          // Undo and redo only restore states this plugin already accepted.
          if (transactions.every(isHistoryTransaction)) return null;
          if (!transactions.some(tr => tr.docChanged)) return null;
          const changed = getChangedRanges(combineTransactionSteps(oldState.doc, transactions));
          const inserted = new Map();
          for (const { newRange } of changed) {
            for (const { node, pos } of findChildrenInRange(newState.doc, newRange, isChip)) {
              inserted.set(pos, node);
            }
          }
          if (!inserted.size) return null;
          const taken = new Set();
          for (const { node, pos } of findChildren(newState.doc, isChip)) {
            if (!inserted.has(pos)) claimIds(taken, node.attrs);
          }
          // An edited or moved chip keeps its ids unless another chip has its response identifier,
          // which only a copy shares; repeated choice ids are left to the save.
          const existing = new Set(
            findChildren(oldState.doc, isChip).map(({ node }) => node.attrs.responseIdentifier),
          );
          let tr = null;
          for (const [pos, node] of [...inserted].sort(([a], [b]) => a - b)) {
            let { attrs } = node;
            const stale = existing.has(attrs.responseIdentifier)
              ? taken.has(attrs.responseIdentifier)
              : needsFreshIds(attrs, taken);
            if (stale) {
              attrs = withFreshIds(attrs, taken);
              tr = (tr || newState.tr).setNodeMarkup(pos, undefined, attrs);
            }
            claimIds(taken, attrs);
          }
          return tr;
        },
      }),
    ];
  },
});
