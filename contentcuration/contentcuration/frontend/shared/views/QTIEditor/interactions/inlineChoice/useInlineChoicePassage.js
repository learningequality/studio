import { computed, readonly, ref, unref } from 'vue';
// The resolver does not read package `exports` subpaths.
// eslint-disable-next-line import/no-unresolved
import { AllSelection, Plugin } from '@tiptap/pm/state';
import { findChildren } from '@tiptap/core';
import useKLiveRegion from 'kolibri-design-system/lib/composables/useKLiveRegion';
import { qtiEditorStrings } from '../../qtiEditorStrings';
import { generateRandomSlug } from '../../utils/generateRandomSlug';
import { InlineChoiceNode, findChip, isChip } from './InlineChoiceNode';
import { describeChip, providePassageChips } from './passageChips';
import { storedHTML } from 'shared/views/TipTapEditor/TipTapEditor/utils/imageSrc';

// Select-all selects the passage itself, where an inline node cannot go. Over a passage of one
// paragraph, it is taken as that paragraph's text.
function paragraphOfAllSelection({ doc, selection, schema }) {
  const only = doc.childCount === 1 ? doc.firstChild : null;
  const holdsChip = only && only.type.contentMatch.matchType(schema.nodes[InlineChoiceNode.name]);
  if (!(selection instanceof AllSelection) || !holdsChip) return null;
  return { from: 1, to: doc.content.size - 1 };
}

/**
 * The chip a caret move went straight over, or null. The caret passes a chip in one step, and
 * a screen reader reads out the text the caret crosses, but there is none in a chip.
 */
function crossedChip(prevState, state) {
  const before = prevState.selection;
  const after = state.selection;
  if (!before.empty || !after.empty || before.head === after.head) return null;
  const from = Math.min(before.head, after.head);
  const node = state.doc.nodeAt(from);
  return node && isChip(node) && from + node.nodeSize === Math.max(before.head, after.head)
    ? node
    : null;
}

/** Whether two documents hold the same chips, in the same order, with the same options. */
function sameChips(prevDoc, doc) {
  const before = findChildren(prevDoc, isChip);
  const after = findChildren(doc, isChip);
  return before.length === after.length && before.every(({ node }, i) => node.eq(after[i].node));
}

/** The response identifiers of the chips in `doc` that `prevDoc` lacks or holds otherwise. */
function changedChips(prevDoc, doc) {
  const before = new Map(
    findChildren(prevDoc, isChip).map(({ node }) => [node.attrs.responseIdentifier, node]),
  );
  return findChildren(doc, isChip)
    .map(({ node }) => node)
    .filter(node => !before.get(node.attrs.responseIdentifier)?.eq(node))
    .map(node => node.attrs.responseIdentifier);
}

/** The chips in `prevDoc` that `doc` no longer holds; a moved chip keeps its identifier. */
function removedChips(prevDoc, doc) {
  const kept = new Set(findChildren(doc, isChip).map(({ node }) => node.attrs.responseIdentifier));
  return findChildren(prevDoc, isChip)
    .map(({ node }) => node)
    .filter(node => !kept.has(node.attrs.responseIdentifier));
}

/**
 * @typedef  {object} InlineChoicePassageObject
 * @property {import('@tiptap/core').AnyExtension[]} extensions - For the passage's
 * `TipTapEditor` `extensions` prop: the inline choice node.
 * @property {object[]} insertActions - For its `insertActions` prop: Insert, which adds a chip
 * and opens it.
 * @property {Readonly<import('vue').Ref<?string>>} openResponseIdentifier - The response
 * identifier of the chip whose options panel is open, or `null`.
 * @property {(responseIdentifier: ?string) => void} openDropdown - Opens a chip's options
 * panel, or closes it with `null`.
 * @property {(responseIdentifier: string) => void} focusChip - Focuses a chip's button, or the
 * editor when the chip has left the passage.
 * @property {(responseIdentifier: string, change: { options?: Array<{ id: string, text: string }>,
 * correctId?: ?string }) => boolean} updateDropdown - Applies an edit from the options panel
 * as one step of the passage's history; `false` when there is no such chip, or the change
 * would leave it invalid.
 * @property {() => void} undo - Undoes a step of the passage's history, and opens the chip it
 * changed when that is not the open one.
 * @property {() => void} redo - Redoes a step of the passage's history, as `undo` does.
 */

/**
 * Everything a passage's `TipTapEditor` needs to hold inline choice dropdowns. Call from the
 * setup of the component that renders the editor, so the chips can reach what it provides.
 *
 * `onChange` receives the passage's HTML after every change to its chips, and while a dropdown
 * is open after every change at all, which `TipTapEditor` itself only reports on blur. The
 * options panel, outside the editor, edits the passage through `updateDropdown` and has to show
 * each edit, and each undo, as it happens; and the question's validation has to follow chips
 * removed or restored in the passage.
 * @param {object} [options]
 * @param {string[] | import('vue').Ref<string[]>} [options.errorResponseIdentifiers] - The
 * response identifiers of the dropdowns with validation errors.
 * @param {boolean | import('vue').Ref<boolean>} [options.showAnswers] - Whether a read-only
 * passage shows each correct answer.
 * @param {?string} [options.describedBy] - The id of the passage's helper text, which
 * describes the editor.
 * @param {(html: string) => void} [options.onChange] - Receives the passage's HTML, as above.
 * @returns {InlineChoicePassageObject} What the passage's editor and options panel use.
 */
export function useInlineChoicePassage({
  errorResponseIdentifiers = [],
  showAnswers = true,
  describedBy = null,
  onChange = () => {},
} = {}) {
  const openResponseIdentifier = ref(null);
  // `setEditable` emits `update`; `editor.isEditable` itself is not reactive.
  const isEditable = ref(false);
  let editor = null;

  const syncPassage = () => onChange(storedHTML(editor));

  function openDropdown(responseIdentifier) {
    openResponseIdentifier.value = responseIdentifier;
    // The panel reads the dropdown from the synced passage, which may not hold it yet.
    if (editor && responseIdentifier !== null) syncPassage();
  }

  function focusChip(responseIdentifier) {
    if (!editor) return;
    const found = findChip(editor.state.doc, responseIdentifier);
    if (found) editor.view.nodeDOM(found.pos).querySelector('button')?.focus();
    else editor.commands.focus();
  }

  /**
   * One step of the passage's history, so undo restores what the panel showed before it.
   *
   * @param {string} responseIdentifier
   * @param {{ options?: Array<{id: string, text: string}>, correctId?: string|null }} change
   * @returns {boolean} false when there is no such chip, or the change would leave it invalid
   */
  function updateDropdown(responseIdentifier, change) {
    return Boolean(editor?.commands.updateInlineChoice(responseIdentifier, change));
  }

  // A step taken from the options panel or a focused chip, outside the passage's focus.
  let isSteppingFromOutside = false;

  /**
   * Steps through the passage's history, which holds the panel's edits too, for the panel and
   * the chips, which keep their keys from the passage. A step that changes another chip than the
   * open one opens that chip, where it can be seen.
   */
  function stepHistory(direction) {
    if (!editor) return;
    const prevDoc = editor.state.doc;
    isSteppingFromOutside = true;
    try {
      editor.commands[direction]();
    } finally {
      isSteppingFromOutside = false;
    }
    const open = openResponseIdentifier.value;
    const changed = changedChips(prevDoc, editor.state.doc);
    if (open !== null && changed.length && !changed.includes(open)) openDropdown(changed[0]);
  }

  const isInError = responseIdentifier =>
    unref(errorResponseIdentifiers).includes(responseIdentifier);

  /** What a screen reader should hear about the chips a change crossed or removed, if any. */
  function chipMessage(prevState, state) {
    if (state.doc.eq(prevState.doc)) {
      const crossed = crossedChip(prevState, state);
      if (!crossed) return null;
      const hasErrors = isInError(crossed.attrs.responseIdentifier);
      return describeChip(crossed.attrs, { hasErrors }).accessibleName;
    }
    const removed = removedChips(prevState.doc, state.doc);
    if (removed.length > 1)
      return qtiEditorStrings.answerDropdownsRemoved$({ count: removed.length });
    if (!removed.length) return null;
    const { label } = describeChip(removed[0].attrs);
    return qtiEditorStrings.answerDropdownRemoved$({ label });
  }

  // Assertive, so it is read as a crossed character would be, rather than after it.
  const { sendAssertiveMessage } = useKLiveRegion();
  const announcer = new Plugin({
    view: () => ({
      update(view, prevState) {
        // Only what the author does in the passage, not what loading or another field does to it.
        if (!view.editable || !(view.hasFocus() || isSteppingFromOutside)) return;
        const message = chipMessage(prevState, view.state);
        if (message) sendAssertiveMessage(message);
      },
    }),
  });

  const description = new Plugin({
    props: { attributes: describedBy ? { 'aria-describedby': describedBy } : {} },
  });

  const readonlyOpenResponseIdentifier = readonly(openResponseIdentifier);
  providePassageChips({
    openResponseIdentifier: readonlyOpenResponseIdentifier,
    openDropdown,
    focusChip,
    stepHistory,
    isEditable: readonly(isEditable),
    errorResponseIdentifiers: computed(() => unref(errorResponseIdentifiers)),
    showAnswers: computed(() => unref(showAnswers)),
  });

  const node = InlineChoiceNode.extend({
    addProseMirrorPlugins() {
      return [...this.parent(), announcer, description];
    },
    onCreate() {
      editor = this.editor;
      isEditable.value = editor.isEditable;
    },
    onDestroy() {
      editor = null;
    },
    onUpdate() {
      isEditable.value = this.editor.isEditable;
    },
    onTransaction({ transaction }) {
      if (!transaction.docChanged) return;
      const isOpen = openResponseIdentifier.value !== null;
      if (!isOpen && sameChips(transaction.before, transaction.doc)) return;
      syncPassage();
      // Undo, delete or cut can take the open chip out of the passage.
      if (isOpen && !findChip(transaction.doc, openResponseIdentifier.value)) openDropdown(null);
    },
  });

  const insertAction = {
    name: InlineChoiceNode.name,
    title: qtiEditorStrings.insertInlineChoice$(),
    icon: 'add',
    prominent: true,
    // Before focus, the chip goes at the end of the passage, which always takes one.
    // Replacing a multi-line selection with an inline node would join the lines.
    isAvailable: ({ editor, selection, canInsertNode }) =>
      !selection.hasCursor ||
      (!selection.spansLines &&
        (canInsertNode(InlineChoiceNode.name) || Boolean(paragraphOfAllSelection(editor.state)))),
    handler: ({ editor, selection }) => {
      const responseIdentifier = generateRandomSlug('response');
      const paragraph = paragraphOfAllSelection(editor.state);
      let chain = editor.chain().focus(selection.hasCursor ? undefined : 'end');
      if (paragraph) chain = chain.setTextSelection(paragraph);
      chain.insertInlineChoice(responseIdentifier).run();
      openDropdown(responseIdentifier);
    },
  };

  return {
    extensions: [node],
    insertActions: [insertAction],
    openResponseIdentifier: readonlyOpenResponseIdentifier,
    openDropdown,
    focusChip,
    updateDropdown,
    undo: () => stepHistory('undo'),
    redo: () => stepHistory('redo'),
  };
}
