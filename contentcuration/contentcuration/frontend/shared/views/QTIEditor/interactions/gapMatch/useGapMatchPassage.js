import { computed, readonly, ref, unref } from 'vue';
// The resolver does not read package `exports` subpaths.
/* eslint-disable import/no-unresolved */
import { isHistoryTransaction } from '@tiptap/pm/history';
import { AllSelection, Plugin } from '@tiptap/pm/state';
/* eslint-enable import/no-unresolved */
import { findChildren } from '@tiptap/core';
import useKLiveRegion from 'kolibri-design-system/lib/composables/useKLiveRegion';
import { qtiEditorStrings } from '../../qtiEditorStrings';
import { GAP_INSERTED, GapNode, isGap } from './GapNode';
import { describeGap, gapAnswerText, loadFormulaSpeech, providePassageGaps } from './passageGaps';
import { storedHTML } from 'shared/views/TipTapEditor/TipTapEditor/utils/imageSrc';

const gapNodes = doc => findChildren(doc, isGap).map(({ node }) => node);

function sameGaps(prevDoc, doc) {
  const before = gapNodes(prevDoc);
  const after = gapNodes(doc);
  return before.length === after.length && before.every((node, i) => node.eq(after[i]));
}

function gapsOnlyIn(doc, otherDoc) {
  const inOther = new Set(gapNodes(otherDoc).map(node => node.attrs.identifier));
  return gapNodes(doc).filter(node => !inOther.has(node.attrs.identifier));
}

const gapNumber = (doc, identifier) =>
  gapNodes(doc).findIndex(node => node.attrs.identifier === identifier) + 1;

const describeIn = (doc, node) =>
  describeGap({ answer: gapAnswerText(node), number: gapNumber(doc, node.attrs.identifier) });

// Select-all selects the passage itself, where an inline node cannot go.
function paragraphOfAllSelection({ doc, selection, schema }) {
  const only = doc.childCount === 1 ? doc.firstChild : null;
  const holdsGap = only && only.type.contentMatch.matchType(schema.nodes[GapNode.name]);
  if (!(selection instanceof AllSelection) || !holdsGap) return null;
  return { from: 1, to: doc.content.size - 1 };
}

const isSpace = (doc, pos) => /\s/.test(doc.textBetween(pos, pos + 1));

function trimmedRange(doc, { from, to }) {
  while (from < to && isSpace(doc, from)) from++;
  while (to > from && isSpace(doc, to - 1)) to--;
  return { from, to };
}

function answerBetween(doc, { from, to }) {
  const answer = [];
  doc.slice(from, to).content.forEach(node => {
    if (node.isText || node.type.name === 'math') answer.push(node.toJSON());
  });
  return answer;
}

function rangeHolds(doc, { from, to }, test) {
  let holds = false;
  doc.nodesBetween(from, to, node => {
    if (test(node)) holds = true;
    return !holds;
  });
  return holds;
}

const isGapOrBreak = node => isGap(node) || node.type.name === 'hardBreak';

function selectionHoldsGap({ doc, selection }) {
  return (
    rangeHolds(doc, selection, isGap) ||
    isGap(selection.$from.parent) ||
    isGap(selection.$to.parent)
  );
}

/**
 * @typedef  {object} GapMatchPassageObject
 * @property {import('@tiptap/core').AnyExtension[]} extensions - For the passage's
 *   `TipTapEditor` `extensions` prop: the gap node.
 * @property {object[]} insertActions - For its `insertActions` prop: Insert, which adds a gap.
 */

/**
 * Everything a passage's `TipTapEditor` needs to hold gaps. Call from the setup of the
 * component that renders the editor, so the gaps can reach what it provides.
 *
 * `onChange` receives the passage's HTML after every change to its gaps or their answers, which
 * `TipTapEditor` itself only reports on blur, so that the question's validation follows the
 * answers as they are typed.
 *
 * @param {object} [options]
 * @param {string[] | import('vue').Ref<string[]>} [options.errorGapIds] - The identifiers of the
 *   gaps with validation errors.
 * @param {boolean | import('vue').Ref<boolean>} [options.showAnswers] - Whether a read-only
 *   passage shows each gap's answer.
 * @param {?string} [options.describedBy] - The id of the passage's helper text, which describes
 *   the editor while it can be edited.
 * @param {(html: string) => void} [options.onChange] - Receives the passage's HTML, as above.
 * @returns {GapMatchPassageObject} What the passage's editor uses.
 */
export function useGapMatchPassage({
  errorGapIds = [],
  showAnswers = true,
  describedBy = null,
  onChange = () => {},
} = {}) {
  // `setEditable` emits `update`; `editor.isEditable` itself is not reactive.
  const isEditable = ref(false);
  const gapIds = ref([]);
  let editor = null;

  const readGaps = doc => {
    const gaps = gapNodes(doc);
    gapIds.value = gaps.map(node => node.attrs.identifier);
    loadFormulaSpeech(gaps);
  };

  function gapMessage(prevState, state) {
    const entered = state.selection.$from.parent;
    if (state.doc.eq(prevState.doc)) {
      if (!isGap(entered) || prevState.selection.$from.parent === entered) return null;
      return describeIn(state.doc, entered);
    }
    const removed = gapsOnlyIn(prevState.doc, state.doc);
    if (removed.length > 1) return qtiEditorStrings.gapsRemoved$({ count: removed.length });
    if (removed.length) {
      return qtiEditorStrings.gapRemoved$({ name: describeIn(prevState.doc, removed[0]) });
    }
    const added = gapsOnlyIn(state.doc, prevState.doc);
    if (added.length > 1) return qtiEditorStrings.gapsAdded$({ count: added.length });
    return added.length ? describeIn(state.doc, added[0]) : null;
  }

  const { sendAssertiveMessage } = useKLiveRegion();
  const announcer = new Plugin({
    state: {
      init: () => false,
      apply: tr => Boolean(tr.getMeta(GAP_INSERTED)) || isHistoryTransaction(tr),
    },
    view: () => ({
      update(view, prevState) {
        // Tiptap's `focus` command focuses the editor in the next animation frame, after the
        // toolbar's command.
        const isCommand = announcer.getState(view.state);
        if (!view.editable || !(view.hasFocus() || isCommand)) return;
        const message = gapMessage(prevState, view.state);
        if (message) sendAssertiveMessage(message);
      },
    }),
  });

  const describe = view => {
    if (describedBy && view.editable) view.dom.setAttribute('aria-describedby', describedBy);
    else view.dom.removeAttribute('aria-describedby');
  };
  const description = new Plugin({
    view(view) {
      describe(view);
      return { update: describe };
    },
  });

  providePassageGaps({
    gapIds: readonly(gapIds),
    isEditable: readonly(isEditable),
    errorGapIds: computed(() => unref(errorGapIds)),
    showAnswers: computed(() => unref(showAnswers)),
  });

  const node = GapNode.extend({
    addProseMirrorPlugins() {
      return [...this.parent(), announcer, description];
    },
    onCreate() {
      editor = this.editor;
      isEditable.value = editor.isEditable;
      readGaps(editor.state.doc);
    },
    onDestroy() {
      editor = null;
    },
    onUpdate() {
      isEditable.value = this.editor.isEditable;
      loadFormulaSpeech(gapNodes(this.editor.state.doc));
    },
    onTransaction({ transaction }) {
      if (!transaction.docChanged || sameGaps(transaction.before, transaction.doc)) return;
      readGaps(transaction.doc);
      onChange(storedHTML(editor));
    },
  });

  const insertAction = {
    name: GapNode.name,
    title: qtiEditorStrings.insertGap$(),
    icon: 'insert',
    prominent: true,
    isAvailable: ({ editor: { state }, selection, canInsertNode }) => {
      if (!selection.hasCursor) return true;
      const paragraph = paragraphOfAllSelection(state);
      if (paragraph) return !rangeHolds(state.doc, paragraph, isGapOrBreak);
      return !selection.spansLines && canInsertNode(GapNode.name) && !selectionHoldsGap(state);
    },
    handler: ({ editor, selection }) => {
      if (!selection.hasCursor) {
        editor.chain().focus('end').insertGap().run();
        return;
      }
      const { state } = editor;
      const range = trimmedRange(state.doc, paragraphOfAllSelection(state) ?? state.selection);
      editor
        .chain()
        .focus()
        .setTextSelection(range)
        .insertGap(answerBetween(state.doc, range))
        .run();
    },
  };

  return { extensions: [node], insertActions: [insertAction] };
}
