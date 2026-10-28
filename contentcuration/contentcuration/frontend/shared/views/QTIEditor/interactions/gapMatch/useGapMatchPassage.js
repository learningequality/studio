import { computed, readonly, ref, unref } from 'vue';
// The resolver does not read package `exports` subpaths.
// eslint-disable-next-line import/no-unresolved
import { AllSelection, Plugin } from '@tiptap/pm/state';
import { findChildren } from '@tiptap/core';
import useKLiveRegion from 'kolibri-design-system/lib/composables/useKLiveRegion';
import { qtiEditorStrings } from '../../qtiEditorStrings';
import { GapNode, isGap } from './GapNode';
import { describeGap, providePassageGaps } from './passageGaps';
import { storedHTML } from 'shared/views/TipTapEditor/TipTapEditor/utils/imageSrc';

const gapNodes = doc => findChildren(doc, isGap).map(({ node }) => node);

/** Whether two documents hold the same gaps, in the same order, with the same answers. */
function sameGaps(prevDoc, doc) {
  const before = gapNodes(prevDoc);
  const after = gapNodes(doc);
  return before.length === after.length && before.every((node, i) => node.eq(after[i]));
}

/** The gaps in `prevDoc` that `doc` no longer holds; a moved gap keeps its identifier. */
function removedGaps(prevDoc, doc) {
  const kept = new Set(gapNodes(doc).map(node => node.attrs.identifier));
  return gapNodes(prevDoc).filter(node => !kept.has(node.attrs.identifier));
}

const gapNumber = (doc, identifier) =>
  gapNodes(doc).findIndex(node => node.attrs.identifier === identifier) + 1;

const describeIn = (doc, node) =>
  describeGap({ answer: node.textContent, number: gapNumber(doc, node.attrs.identifier) });

// Select-all selects the passage itself, where an inline node cannot go. Over a passage of one
// paragraph, it is taken as that paragraph's text.
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

// A gap holds text and formulas, so the rest of the highlighted content is left out.
function answerBetween(doc, { from, to }) {
  const answer = [];
  doc.slice(from, to).content.forEach(node => {
    if (node.isText || node.type.name === 'math') answer.push(node.toJSON());
  });
  return answer;
}

function selectionHoldsGap({ doc, selection }) {
  let holds = false;
  doc.nodesBetween(selection.from, selection.to, node => {
    if (isGap(node)) holds = true;
    return !holds;
  });
  return holds || isGap(selection.$from.parent) || isGap(selection.$to.parent);
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
 *   the editor.
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

  const readGapIds = doc => {
    gapIds.value = gapNodes(doc).map(node => node.attrs.identifier);
  };

  /** What a screen reader should hear about the gap a change entered or removed, if any. */
  function gapMessage(prevState, state) {
    if (state.doc.eq(prevState.doc)) {
      const entered = state.selection.$from.parent;
      if (!isGap(entered) || prevState.selection.$from.parent === entered) return null;
      return describeIn(state.doc, entered);
    }
    const removed = removedGaps(prevState.doc, state.doc);
    if (removed.length > 1) return qtiEditorStrings.gapsRemoved$({ count: removed.length });
    if (!removed.length) return null;
    return qtiEditorStrings.gapRemoved$({ name: describeIn(prevState.doc, removed[0]) });
  }

  // Assertive, so it is read as the caret moves, rather than after it.
  const { sendAssertiveMessage } = useKLiveRegion();
  const announcer = new Plugin({
    view: () => ({
      update(view, prevState) {
        // Only what the author does in the passage, not what loading or another field does to it.
        if (!view.editable || !view.hasFocus()) return;
        const message = gapMessage(prevState, view.state);
        if (message) sendAssertiveMessage(message);
      },
    }),
  });

  const description = new Plugin({
    props: { attributes: describedBy ? { 'aria-describedby': describedBy } : {} },
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
      readGapIds(editor.state.doc);
    },
    onDestroy() {
      editor = null;
    },
    onUpdate() {
      isEditable.value = this.editor.isEditable;
    },
    onTransaction({ transaction }) {
      if (!transaction.docChanged || sameGaps(transaction.before, transaction.doc)) return;
      readGapIds(transaction.doc);
      onChange(storedHTML(editor));
    },
  });

  const insertAction = {
    name: GapNode.name,
    title: qtiEditorStrings.insertGap$(),
    icon: 'insert',
    prominent: true,
    // Before focus, the gap goes at the end of the passage, which always takes one.
    // Replacing a multi-line selection with an inline node would join the lines.
    isAvailable: ({ editor: { state }, selection, canInsertNode }) =>
      !selection.hasCursor ||
      Boolean(paragraphOfAllSelection(state)) ||
      (!selection.spansLines && canInsertNode(GapNode.name) && !selectionHoldsGap(state)),
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
